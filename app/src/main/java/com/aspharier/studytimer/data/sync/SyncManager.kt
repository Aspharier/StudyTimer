package com.aspharier.studytimer.data.sync

import com.aspharier.studytimer.data.repository.ExamGoalRepository
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.data.repository.SyllabusRepository
import com.aspharier.studytimer.data.repository.MockTestRepository
import com.aspharier.studytimer.domain.model.ExamGoal
import com.aspharier.studytimer.domain.model.StudySession
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.Topic
import com.aspharier.studytimer.domain.model.TopicStatus
import com.aspharier.studytimer.domain.model.SubTopic
import com.aspharier.studytimer.domain.model.MockTest
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext

@Singleton
class SyncManager @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val sessionRepository: StudySessionRepository,
    private val syllabusRepository: SyllabusRepository,
    private val examGoalRepository: ExamGoalRepository,
    private val mockTestRepository: MockTestRepository,
    @ApplicationContext private val context: Context
) {
    private val preferences = context.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)

    private fun getSyncedSessionIds(): MutableSet<Long> {
        val stringSet = preferences.getStringSet("synced_session_ids", emptySet()) ?: emptySet()
        return stringSet.mapNotNull { it.toLongOrNull() }.toMutableSet()
    }

    private fun saveSyncedSessionIds(ids: Set<Long>) {
        preferences.edit().putStringSet("synced_session_ids", ids.map { it.toString() }.toSet()).apply()
    }

    private fun getDeletedSessionIds(): MutableSet<Long> {
        val stringSet = preferences.getStringSet("deleted_session_ids", emptySet()) ?: emptySet()
        return stringSet.mapNotNull { it.toLongOrNull() }.toMutableSet()
    }

    private fun saveDeletedSessionIds(ids: Set<Long>) {
        preferences.edit().putStringSet("deleted_session_ids", ids.map { it.toString() }.toSet()).apply()
    }

    private fun getSyncedMockTestIds(): MutableSet<Long> {
        val stringSet = preferences.getStringSet("synced_mock_test_ids", emptySet()) ?: emptySet()
        return stringSet.mapNotNull { it.toLongOrNull() }.toMutableSet()
    }

    private fun saveSyncedMockTestIds(ids: Set<Long>) {
        preferences.edit().putStringSet("synced_mock_test_ids", ids.map { it.toString() }.toSet()).apply()
    }

    private fun getDeletedMockTestIds(): MutableSet<Long> {
        val stringSet = preferences.getStringSet("deleted_mock_test_ids", emptySet()) ?: emptySet()
        return stringSet.mapNotNull { it.toLongOrNull() }.toMutableSet()
    }

    private fun saveDeletedMockTestIds(ids: Set<Long>) {
        preferences.edit().putStringSet("deleted_mock_test_ids", ids.map { it.toString() }.toSet()).apply()
    }

    suspend fun sync(): Result<Unit> = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid ?: return@withContext Result.failure(Exception("User not authenticated"))
        
        try {
            val userDocRef = firestore.collection("users").document(uid)
            
            // Delete locally deleted sessions from Firestore
            val deletedIds = getDeletedSessionIds()
            val syncedIds = getSyncedSessionIds()
            for (id in deletedIds) {
                userDocRef.collection("sessions").document(id.toString()).delete().await()
                syncedIds.remove(id)
            }
            saveSyncedSessionIds(syncedIds)
            saveDeletedSessionIds(emptySet())

            // Delete locally deleted mock tests from Firestore
            val deletedMockIds = getDeletedMockTestIds()
            val syncedMockIds = getSyncedMockTestIds()
            for (id in deletedMockIds) {
                userDocRef.collection("mock_tests").document(id.toString()).delete().await()
                syncedMockIds.remove(id)
            }
            saveSyncedMockTestIds(syncedMockIds)
            saveDeletedMockTestIds(emptySet())

            // 1. Download from Cloud to Local
            downloadCloudToLocal(uid)

            // 2. Upload from Local to Cloud
            uploadLocalToCloud(uid)

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun downloadCloudToLocal(uid: String) {
        // Download Exam Goals
        val goalsSnapshot = firestore.collection("users").document(uid).collection("exam_goals")
            .get().await()
        val validGoalIds = mutableSetOf<Long>()
        for (doc in goalsSnapshot.documents) {
            val id = doc.id.toLongOrNull() ?: continue
            val name = doc.getString("name") ?: continue
            val examDate = doc.getString("examDate") ?: continue
            val dailyTargetMinutes = doc.getIntSafely("dailyTargetMinutes") ?: 360
            val createdAt = doc.getLongSafely("createdAt") ?: System.currentTimeMillis()
            val isActive = doc.getBoolean("isActive") ?: false

            val goal = ExamGoal(id = id, name = name, examDate = examDate, dailyTargetMinutes = dailyTargetMinutes, createdAt = createdAt, isActive = isActive)
            examGoalRepository.insertExamGoal(goal)
            validGoalIds.add(id)
        }

        // Download Subjects
        val subjectsSnapshot = firestore.collection("users").document(uid).collection("subjects")
            .get().await()
        val validSubjectIds = mutableSetOf<Long>()
        for (doc in subjectsSnapshot.documents) {
            val id = doc.id.toLongOrNull() ?: continue
            val name = doc.getString("name") ?: continue
            val examGoalId = doc.getLongSafely("examGoalId") ?: continue
            
            // Relational Integrity: Check if the referenced exam goal exists
            if (!validGoalIds.contains(examGoalId)) {
                if (examGoalRepository.getExamGoalById(examGoalId) == null) {
                    continue // Skip inserting subject if parent exam goal does not exist
                }
            }

            val colorHex = doc.getString("colorHex") ?: "#4D96FF"
            val sortOrder = doc.getIntSafely("sortOrder") ?: 0
            val targetHours = doc.getIntSafely("targetHours")
            val priority = doc.getString("priority") ?: "MEDIUM"

            val subject = Subject(
                id = id,
                name = name,
                examGoalId = examGoalId,
                colorHex = colorHex,
                sortOrder = sortOrder,
                targetHours = targetHours,
                priority = priority
            )
            syllabusRepository.insertSubject(subject)
            validSubjectIds.add(id)
        }

        // Download Topics
        val topicsSnapshot = firestore.collection("users").document(uid).collection("topics")
            .get().await()
        for (doc in topicsSnapshot.documents) {
            val id = doc.id.toLongOrNull() ?: continue
            val name = doc.getString("name") ?: continue
            val subjectId = doc.getLongSafely("subjectId") ?: continue
            
            // Relational Integrity: Check if the referenced subject exists
            if (!validSubjectIds.contains(subjectId)) {
                if (syllabusRepository.getSubjectById(subjectId) == null) {
                    continue // Skip inserting topic if parent subject does not exist
                }
            }

            val statusStr = doc.getString("status") ?: "NOT_STARTED"
            val sortOrder = doc.getIntSafely("sortOrder") ?: 0
            
            // Sync sub-topics list from document if it exists
            @Suppress("UNCHECKED_CAST")
            val subTopicsDataList = doc.get("subTopics") as? List<Map<String, Any>>
            val subTopics = subTopicsDataList?.mapNotNull { subMap ->
                val subId = subMap["id"] as? String ?: return@mapNotNull null
                val subName = subMap["name"] as? String ?: return@mapNotNull null
                val subStatusStr = subMap["status"] as? String ?: "NOT_STARTED"
                val subStatus = runCatching { TopicStatus.valueOf(subStatusStr) }.getOrDefault(TopicStatus.NOT_STARTED)
                SubTopic(id = subId, name = subName, status = subStatus)
            } ?: emptyList()

            val status = runCatching { TopicStatus.valueOf(statusStr) }.getOrDefault(TopicStatus.NOT_STARTED)

            val topic = Topic(id = id, name = name, subjectId = subjectId, status = status, sortOrder = sortOrder, subTopics = subTopics)
            syllabusRepository.insertTopic(topic)
        }

        // Download Sessions
        val sessionsSnapshot = firestore.collection("users").document(uid).collection("sessions")
            .get().await()
        val downloadedSessionIds = mutableSetOf<Long>()
        val syncedIds = getSyncedSessionIds()

        for (doc in sessionsSnapshot.documents) {
            val id = doc.id.toLongOrNull() ?: continue
            val label = doc.getString("label") ?: "Study Session"
            val durationMinutes = doc.getIntSafely("durationMinutes") ?: 25
            val completedDurationSeconds = doc.getLongSafely("completedDurationSeconds") ?: 0L
            val date = doc.getString("date") ?: continue
            val startTime = doc.getLongSafely("startTime") ?: continue
            val endTime = doc.getLongSafely("endTime")
            val isCompleted = doc.getBoolean("isCompleted") ?: false
            val notes = doc.getString("notes")
            val tag = doc.getString("tag")
            val subjectId = doc.getLongSafely("subjectId")

            val session = StudySession(
                id = id,
                label = label,
                durationMinutes = durationMinutes,
                completedDurationSeconds = completedDurationSeconds,
                date = date,
                startTime = startTime,
                endTime = endTime,
                isCompleted = isCompleted,
                notes = notes,
                tag = tag,
                subjectId = subjectId
            )
            sessionRepository.insertSession(session)
            downloadedSessionIds.add(id)
            syncedIds.add(id)
        }

        // Sync Cloud Deletions back to Room:
        // Any local session that was previously synced but is now missing in cloud must be deleted
        val localSessions = sessionRepository.getAllSessions().first()
        for (localSession in localSessions) {
            if (syncedIds.contains(localSession.id) && !downloadedSessionIds.contains(localSession.id)) {
                sessionRepository.deleteSessionFromSync(localSession.id)
                syncedIds.remove(localSession.id)
            }
        }
        saveSyncedSessionIds(syncedIds)

        // Download Mock Tests
        val mockTestsSnapshot = firestore.collection("users").document(uid).collection("mock_tests")
            .get().await()
        val downloadedMockTestIds = mutableSetOf<Long>()
        val syncedMockIds = getSyncedMockTestIds()

        for (doc in mockTestsSnapshot.documents) {
            val id = doc.id.toLongOrNull() ?: continue
            val examGoalId = doc.getLongSafely("examGoalId") ?: continue
            val subjectId = doc.getLongSafely("subjectId") ?: continue

            // Relational Integrity: Check if parents exist
            if (!validGoalIds.contains(examGoalId)) {
                if (examGoalRepository.getExamGoalById(examGoalId) == null) {
                    continue
                }
            }
            if (!validSubjectIds.contains(subjectId)) {
                if (syllabusRepository.getSubjectById(subjectId) == null) {
                    continue
                }
            }

            val testName = doc.getString("testName") ?: continue
            val scorePercentage = doc.getFloatSafely("scorePercentage") ?: 0f
            val totalMarks = doc.getFloatSafely("totalMarks") ?: 0f
            val obtainedMarks = doc.getFloatSafely("obtainedMarks") ?: 0f
            val notes = doc.getString("notes")
            val date = doc.getString("date") ?: continue
            val createdAt = doc.getLongSafely("createdAt") ?: System.currentTimeMillis()

            val mockTest = MockTest(
                id = id,
                examGoalId = examGoalId,
                subjectId = subjectId,
                testName = testName,
                scorePercentage = scorePercentage,
                totalMarks = totalMarks,
                obtainedMarks = obtainedMarks,
                notes = notes,
                date = date,
                createdAt = createdAt
            )
            mockTestRepository.insertMockTest(mockTest)
            downloadedMockTestIds.add(id)
            syncedMockIds.add(id)
        }

        // Sync Cloud Deletions of Mock Tests back to Room
        val localMockTests = mockTestRepository.getAllMockTests().first()
        for (localMock in localMockTests) {
            if (syncedMockIds.contains(localMock.id) && !downloadedMockTestIds.contains(localMock.id)) {
                mockTestRepository.deleteMockTestFromSync(localMock.id)
                syncedMockIds.remove(localMock.id)
            }
        }
        saveSyncedMockTestIds(syncedMockIds)
    }

    private suspend fun uploadLocalToCloud(uid: String) {
        val userDocRef = firestore.collection("users").document(uid)

        // Upload Exam Goals
        val goals = examGoalRepository.getAllExamGoals().first()
        for (goal in goals) {
            val data = mapOf(
                "name" to goal.name,
                "examDate" to goal.examDate,
                "dailyTargetMinutes" to goal.dailyTargetMinutes,
                "createdAt" to goal.createdAt,
                "isActive" to goal.isActive
            )
            userDocRef.collection("exam_goals").document(goal.id.toString()).set(data).await()
        }

        // Upload Subjects
        val subjects = syllabusRepository.getAllSubjects().first()
        for (subj in subjects) {
            val data = mapOf(
                "name" to subj.name,
                "examGoalId" to subj.examGoalId,
                "colorHex" to subj.colorHex,
                "sortOrder" to subj.sortOrder,
                "targetHours" to subj.targetHours,
                "priority" to subj.priority
            )
            userDocRef.collection("subjects").document(subj.id.toString()).set(data).await()
        }

        // Upload Topics
        for (subj in subjects) {
            val topics = syllabusRepository.getTopicsBySubject(subj.id).first()
            for (topic in topics) {
                val subTopicsList = topic.subTopics.map { sub ->
                    mapOf(
                        "id" to sub.id,
                        "name" to sub.name,
                        "status" to sub.status.name
                    )
                }
                val data = mapOf(
                    "name" to topic.name,
                    "subjectId" to topic.subjectId,
                    "status" to topic.status.name,
                    "sortOrder" to topic.sortOrder,
                    "subTopics" to subTopicsList
                )
                userDocRef.collection("topics").document(topic.id.toString()).set(data).await()
            }
        }

        // Upload Sessions
        val sessions = sessionRepository.getAllSessions().first()
        val syncedIds = getSyncedSessionIds()
        for (session in sessions) {
            val data = mapOf(
                "label" to session.label,
                "durationMinutes" to session.durationMinutes,
                "completedDurationSeconds" to session.completedDurationSeconds,
                "date" to session.date,
                "startTime" to session.startTime,
                "endTime" to session.endTime,
                "isCompleted" to session.isCompleted,
                "notes" to session.notes,
                "tag" to session.tag,
                "subjectId" to session.subjectId
            )
            userDocRef.collection("sessions").document(session.id.toString()).set(data).await()
            syncedIds.add(session.id)
        }
        saveSyncedSessionIds(syncedIds)

        // Upload Mock Tests
        val mockTests = mockTestRepository.getAllMockTests().first()
        val syncedMockIds = getSyncedMockTestIds()
        for (test in mockTests) {
            val data = mapOf(
                "examGoalId" to test.examGoalId,
                "subjectId" to test.subjectId,
                "testName" to test.testName,
                "scorePercentage" to test.scorePercentage,
                "totalMarks" to test.totalMarks,
                "obtainedMarks" to test.obtainedMarks,
                "notes" to test.notes,
                "date" to test.date,
                "createdAt" to test.createdAt
            )
            userDocRef.collection("mock_tests").document(test.id.toString()).set(data).await()
            syncedMockIds.add(test.id)
        }
        saveSyncedMockTestIds(syncedMockIds)
    }

    private fun com.google.firebase.firestore.DocumentSnapshot.getLongSafely(field: String): Long? {
        val value = get(field) ?: return null
        return when (value) {
            is Number -> value.toLong()
            is String -> value.toLongOrNull()
            else -> null
        }
    }

    private fun com.google.firebase.firestore.DocumentSnapshot.getIntSafely(field: String): Int? {
        val value = get(field) ?: return null
        return when (value) {
            is Number -> value.toInt()
            is String -> value.toIntOrNull()
            else -> null
        }
    }

    private fun com.google.firebase.firestore.DocumentSnapshot.getFloatSafely(field: String): Float? {
        val value = get(field) ?: return null
        return when (value) {
            is Number -> value.toFloat()
            is String -> value.toFloatOrNull()
            else -> null
        }
    }
}
