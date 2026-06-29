package com.aspharier.studytimer.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.ExamGoalRepository
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.data.repository.SyllabusRepository
import com.aspharier.studytimer.domain.StudyPlanEngine
import com.aspharier.studytimer.domain.model.ExamGoal
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.Topic
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.DayOfWeek
import javax.inject.Inject
import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import com.aspharier.studytimer.domain.MotivationEngine
import com.aspharier.studytimer.domain.model.Momentum
import com.aspharier.studytimer.domain.model.WeeklyChallenge

data class DashboardUiState(
    val activeExamGoal: ExamGoal? = null,
    val todayStudiedSeconds: Long = 0L,
    val dailyTargetMinutes: Int = 360,
    val currentStreak: Int = 0,
    val subjects: List<Subject> = emptyList(),
    val recommendedTopics: List<Topic> = emptyList(),
    val adaptiveTargetMinutes: Int = 360,
    val isAdaptiveAboveBase: Boolean = false,
    val momentum: Momentum? = null,
    val weeklyChallenges: List<WeeklyChallenge> = emptyList()
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    examGoalRepository: ExamGoalRepository,
    studySessionRepository: StudySessionRepository,
    syllabusRepository: SyllabusRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val todayString: String =
        LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

    val uiState: StateFlow<DashboardUiState> = combine(
        examGoalRepository.getActiveExamGoal(),
        studySessionRepository.getTotalSecondsForDate(todayString),
        studySessionRepository.getAllSessions(),
        syllabusRepository.getAllSubjects(),
        syllabusRepository.getAllTopics()
    ) { activeGoal, todaySeconds, allSessions, allSubjects, allTopics ->

        // Calculate streak: count consecutive days backwards from today with sessions
        val streak = calculateStreak(allSessions.map { it.date }.toSet())

        // Top 5 subjects sorted by completion percentage descending
        val topSubjects = allSubjects
            .sortedByDescending { it.completionPercentage }
            .take(5)

        // Get daily recommendations using StudyPlanEngine
        val recommendations = StudyPlanEngine.getDailyRecommendations(
            topics = allTopics,
            sessions = allSessions,
            examGoal = activeGoal
        )

        // Compute dates for this week (Mon-Sun) and last week (Mon-Sun)
        val today = LocalDate.now()
        val thisMonday = today.with(DayOfWeek.MONDAY)
        val thisSunday = today.with(DayOfWeek.SUNDAY)
        val lastMonday = thisMonday.minusWeeks(1)
        val lastSunday = thisSunday.minusWeeks(1)

        val formatter = DateTimeFormatter.ISO_LOCAL_DATE
        val thisWeekSessions = allSessions.filter {
            try {
                val sessionDate = LocalDate.parse(it.date, formatter)
                !sessionDate.isBefore(thisMonday) && !sessionDate.isAfter(thisSunday)
            } catch (_: Exception) {
                false
            }
        }
        val lastWeekSessions = allSessions.filter {
            try {
                val sessionDate = LocalDate.parse(it.date, formatter)
                !sessionDate.isBefore(lastMonday) && !sessionDate.isAfter(lastSunday)
            } catch (_: Exception) {
                false
            }
        }

        // Calculate personal best daily seconds across all time
        val dailyTotals = allSessions.groupBy { it.date }
            .mapValues { entry -> entry.value.sumOf { it.completedDurationSeconds } }
        val personalBestDailySeconds = dailyTotals.values.maxOrNull() ?: 0L

        val userSetTarget = activeGoal?.dailyTargetMinutes ?: 360
        val motivationState = MotivationEngine.calculateMotivationState(
            context = context,
            userSetTargetMinutes = userSetTarget,
            thisWeekSessions = thisWeekSessions,
            lastWeekSessions = lastWeekSessions,
            personalBestDailySeconds = personalBestDailySeconds
        )

        DashboardUiState(
            activeExamGoal = activeGoal,
            todayStudiedSeconds = todaySeconds,
            dailyTargetMinutes = userSetTarget,
            currentStreak = streak,
            subjects = topSubjects,
            recommendedTopics = recommendations,
            adaptiveTargetMinutes = motivationState.adaptiveTargetMinutes,
            isAdaptiveAboveBase = motivationState.isAdaptiveAboveBase,
            momentum = motivationState.momentum,
            weeklyChallenges = motivationState.challenges
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = DashboardUiState()
    )

    private fun calculateStreak(sessionDates: Set<String>): Int {
        if (sessionDates.isEmpty()) return 0

        var streak = 0
        var date = LocalDate.now()

        // Check today first; if no session today, start from yesterday
        if (!sessionDates.contains(date.format(DateTimeFormatter.ISO_LOCAL_DATE))) {
            // Allow streak to continue if the user hasn't studied today yet
            // but studied yesterday. Don't count today in that case.
            date = date.minusDays(1)
        }

        while (sessionDates.contains(date.format(DateTimeFormatter.ISO_LOCAL_DATE))) {
            streak++
            date = date.minusDays(1)
        }

        return streak
    }
}
