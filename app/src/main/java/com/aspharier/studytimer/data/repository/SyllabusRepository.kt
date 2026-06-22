package com.aspharier.studytimer.data.repository

import com.aspharier.studytimer.data.local.dao.SubjectDao
import com.aspharier.studytimer.data.local.dao.TopicDao
import com.aspharier.studytimer.data.local.entity.SubjectEntity
import com.aspharier.studytimer.data.local.entity.TopicEntity
import com.aspharier.studytimer.data.local.entity.toJsonString
import com.aspharier.studytimer.data.local.entity.toSubTopicsList
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.Topic
import com.aspharier.studytimer.domain.model.TopicStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyllabusRepository @Inject constructor(
    private val subjectDao: SubjectDao,
    private val topicDao: TopicDao
) {
    // Subject operations
    suspend fun insertSubject(subject: Subject): Long {
        return subjectDao.insert(subject.toEntity())
    }

    suspend fun updateSubject(subject: Subject) {
        subjectDao.update(subject.toEntity())
    }

    suspend fun deleteSubject(id: Long) {
        subjectDao.deleteById(id)
    }

    fun getSubjectsByExamGoal(examGoalId: Long): Flow<List<Subject>> {
        return subjectDao.getSubjectsByExamGoal(examGoalId).flatMapLatest { entities ->
            if (entities.isEmpty()) {
                flowOf(emptyList())
            } else {
                val subjectFlows = entities.map { entity ->
                    combine(
                        topicDao.getTopicCount(entity.id),
                        topicDao.getCompletedTopicCount(entity.id)
                    ) { total, completed ->
                        entity.toModel(totalTopics = total, completedTopics = completed)
                    }
                }
                combine(subjectFlows) { it.toList() }
            }
        }
    }

    fun getAllSubjects(): Flow<List<Subject>> {
        return subjectDao.getAllSubjects().flatMapLatest { entities ->
            if (entities.isEmpty()) {
                flowOf(emptyList())
            } else {
                val subjectFlows = entities.map { entity ->
                    combine(
                        topicDao.getTopicCount(entity.id),
                        topicDao.getCompletedTopicCount(entity.id)
                    ) { total, completed ->
                        entity.toModel(totalTopics = total, completedTopics = completed)
                    }
                }
                combine(subjectFlows) { it.toList() }
            }
        }
    }

    suspend fun getSubjectById(id: Long): Subject? {
        return subjectDao.getSubjectById(id)?.toModel()
    }

    // Topic operations
    suspend fun insertTopic(topic: Topic): Long {
        return topicDao.insert(topic.toEntity())
    }

    suspend fun updateTopic(topic: Topic) {
        topicDao.update(topic.toEntity())
    }

    suspend fun deleteTopic(id: Long) {
        topicDao.deleteById(id)
    }

    fun getTopicsBySubject(subjectId: Long): Flow<List<Topic>> {
        return topicDao.getTopicsBySubject(subjectId).map { entities ->
            entities.map { it.toModel() }
        }
    }

    suspend fun updateTopicStatus(id: Long, status: TopicStatus) {
        topicDao.updateStatus(id, status.name)
    }

    fun getAllTopics(): Flow<List<Topic>> {
        return topicDao.getAllTopics().map { entities ->
            entities.map { it.toModel() }
        }
    }

// Mappers
    private fun Subject.toEntity() = SubjectEntity(
        id = id,
        name = name,
        examGoalId = examGoalId,
        colorHex = colorHex,
        sortOrder = sortOrder,
        targetHours = targetHours,
        priority = priority
    )

    private fun SubjectEntity.toModel(totalTopics: Int = 0, completedTopics: Int = 0) = Subject(
        id = id,
        name = name,
        examGoalId = examGoalId,
        colorHex = colorHex,
        sortOrder = sortOrder,
        totalTopics = totalTopics,
        completedTopics = completedTopics,
        targetHours = targetHours,
        priority = priority
    )

    private fun Topic.toEntity() = TopicEntity(
        id = id,
        name = name,
        subjectId = subjectId,
        status = status.name,
        sortOrder = sortOrder,
        subTopicsJson = subTopics.toJsonString()
    )

    private fun TopicEntity.toModel() = Topic(
        id = id,
        name = name,
        subjectId = subjectId,
        status = runCatching { TopicStatus.valueOf(status) }.getOrDefault(TopicStatus.NOT_STARTED),
        sortOrder = sortOrder,
        subTopics = subTopicsJson.toSubTopicsList()
    )
}
