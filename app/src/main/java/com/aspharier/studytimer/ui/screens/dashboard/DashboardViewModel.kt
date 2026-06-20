package com.aspharier.studytimer.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.ExamGoalRepository
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.data.repository.SyllabusRepository
import com.aspharier.studytimer.domain.model.ExamGoal
import com.aspharier.studytimer.domain.model.Subject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class DashboardUiState(
    val activeExamGoal: ExamGoal? = null,
    val todayStudiedSeconds: Long = 0L,
    val dailyTargetMinutes: Int = 360,
    val currentStreak: Int = 0,
    val subjects: List<Subject> = emptyList()
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    examGoalRepository: ExamGoalRepository,
    studySessionRepository: StudySessionRepository,
    syllabusRepository: SyllabusRepository
) : ViewModel() {

    private val todayString: String =
        LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

    val uiState: StateFlow<DashboardUiState> = combine(
        examGoalRepository.getActiveExamGoal(),
        studySessionRepository.getTotalSecondsForDate(todayString),
        studySessionRepository.getAllSessions(),
        syllabusRepository.getAllSubjects()
    ) { activeGoal, todaySeconds, allSessions, allSubjects ->

        // Calculate streak: count consecutive days backwards from today with sessions
        val streak = calculateStreak(allSessions.map { it.date }.toSet())

        // Top 5 subjects sorted by completion percentage descending
        val topSubjects = allSubjects
            .sortedByDescending { it.completionPercentage }
            .take(5)

        DashboardUiState(
            activeExamGoal = activeGoal,
            todayStudiedSeconds = todaySeconds,
            dailyTargetMinutes = activeGoal?.dailyTargetMinutes ?: 360,
            currentStreak = streak,
            subjects = topSubjects
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
