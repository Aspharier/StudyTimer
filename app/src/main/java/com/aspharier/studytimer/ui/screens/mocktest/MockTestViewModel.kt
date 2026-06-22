package com.aspharier.studytimer.ui.screens.mocktest

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.ExamGoalRepository
import com.aspharier.studytimer.data.repository.MockTestRepository
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.data.repository.SyllabusRepository
import com.aspharier.studytimer.domain.model.ExamGoal
import com.aspharier.studytimer.domain.model.MockTest
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.TopicStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

data class MockTestUiState(
    val activeExamGoal: ExamGoal? = null,
    val subjects: List<Subject> = emptyList(),
    val mockTests: List<MockTest> = emptyList(),
    val averageScore: Float = 0f,
    val syllabusCompletionPercentage: Float = 0f,
    val projectedCompletionDate: String = "N/A",
    val projectedDaysToComplete: Int = 0,
    val daysRemaining: Int = 0,
    val requiredPaceHoursPerDay: Float = 0f,
    val actualPaceHoursPerDay: Float = 0f,
    val paceDeficitWarning: Boolean = false,
    val subjectTargetHours: Map<Long, Float> = emptyMap(),
    val subjectActualHours: Map<Long, Float> = emptyMap()
)

@HiltViewModel
class MockTestViewModel @Inject constructor(
    private val mockTestRepository: MockTestRepository,
    private val syllabusRepository: SyllabusRepository,
    private val examGoalRepository: ExamGoalRepository,
    private val studySessionRepository: StudySessionRepository
) : ViewModel() {

    val uiState: StateFlow<MockTestUiState> = combine(
        examGoalRepository.getActiveExamGoal(),
        syllabusRepository.getAllSubjects(),
        mockTestRepository.getAllMockTests(),
        syllabusRepository.getAllTopics(),
        studySessionRepository.getAllSessions()
    ) { activeGoal, allSubjects, allMockTests, allTopics, allSessions ->
        
        val goalMockTests = if (activeGoal != null) {
            allMockTests.filter { it.examGoalId == activeGoal.id }
        } else {
            emptyList()
        }

        val averageScore = if (goalMockTests.isNotEmpty()) {
            goalMockTests.map { it.scorePercentage }.average().toFloat()
        } else {
            0f
        }

        val syllabusCompletion = if (allTopics.isNotEmpty()) {
            allTopics.count { it.status == TopicStatus.COMPLETED }.toFloat() / allTopics.size
        } else {
            0f
        }

        // Calculations for projections
        var projectedDateStr = "N/A"
        var projectedDays = 0
        var daysRemainingVal = 0
        var requiredPace = 0f
        var actualPace = 0f
        var isBehind = false

        if (activeGoal != null && allTopics.isNotEmpty()) {
            val totalTopics = allTopics.size
            val completedTopics = allTopics.count { it.status == TopicStatus.COMPLETED }
            val remainingTopics = totalTopics - completedTopics

            val now = LocalDate.now()
            val fourteenDaysAgo = now.minusDays(14)

            // Compute last 14 days sessions
            val fourteenDaysSessions = allSessions.filter {
                try {
                    val sDate = LocalDate.parse(it.date)
                    (sDate.isEqual(fourteenDaysAgo) || sDate.isAfter(fourteenDaysAgo)) && it.completedDurationSeconds > 0
                } catch (_: Exception) {
                    false
                }
            }
            val totalSeconds14 = fourteenDaysSessions.sumOf { it.completedDurationSeconds }
            actualPace = (totalSeconds14 / 3600f) / 14f

            val totalSecondsAll = allSessions.sumOf { it.completedDurationSeconds }
            val totalHoursAll = totalSecondsAll / 3600f
            val avgHoursPerTopic = totalHoursAll / Math.max(1, completedTopics)

            val hoursNeeded = remainingTopics * avgHoursPerTopic
            
            daysRemainingVal = try {
                val target = LocalDate.parse(activeGoal.examDate, DateTimeFormatter.ISO_LOCAL_DATE)
                ChronoUnit.DAYS.between(now, target).coerceAtLeast(0).toInt()
            } catch (_: Exception) {
                0
            }

            requiredPace = if (daysRemainingVal > 0) hoursNeeded / daysRemainingVal else 0f
            val projectedDaysToComplete = if (actualPace > 0.05f) hoursNeeded / actualPace else 999f
            projectedDays = Math.round(projectedDaysToComplete)
            isBehind = projectedDaysToComplete > daysRemainingVal

            if (projectedDaysToComplete < 999f) {
                val projectedDate = now.plusDays(projectedDaysToComplete.toLong())
                projectedDateStr = projectedDate.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
            } else {
                projectedDateStr = "Infinite"
            }
        }

        // Subject Targets and Actual hours
        val targetHoursMap = allSubjects.associate { it.id to (it.targetHours?.toFloat() ?: 0f) }
        val actualHoursMap = allSubjects.associate { subject ->
            val subjSessions = allSessions.filter { it.subjectId == subject.id && it.completedDurationSeconds > 0 }
            val hours = subjSessions.sumOf { it.completedDurationSeconds } / 3600f
            subject.id to hours
        }

        MockTestUiState(
            activeExamGoal = activeGoal,
            subjects = allSubjects,
            mockTests = goalMockTests.sortedByDescending { it.date },
            averageScore = averageScore,
            syllabusCompletionPercentage = syllabusCompletion,
            projectedCompletionDate = projectedDateStr,
            projectedDaysToComplete = projectedDays,
            daysRemaining = daysRemainingVal,
            requiredPaceHoursPerDay = requiredPace,
            actualPaceHoursPerDay = actualPace,
            paceDeficitWarning = isBehind,
            subjectTargetHours = targetHoursMap,
            subjectActualHours = actualHoursMap
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = MockTestUiState()
    )

    fun logMockTest(
        examGoalId: Long,
        subjectId: Long,
        testName: String,
        obtainedMarks: Float,
        totalMarks: Float,
        notes: String?,
        date: String
    ) {
        viewModelScope.launch {
            val scorePercentage = if (totalMarks > 0f) (obtainedMarks / totalMarks) * 100f else 0f
            val test = MockTest(
                examGoalId = examGoalId,
                subjectId = subjectId,
                testName = testName,
                scorePercentage = scorePercentage,
                totalMarks = totalMarks,
                obtainedMarks = obtainedMarks,
                notes = notes,
                date = date
            )
            mockTestRepository.insertMockTest(test)
        }
    }

    fun deleteMockTest(id: Long) {
        viewModelScope.launch {
            mockTestRepository.deleteMockTest(id)
        }
    }
}
