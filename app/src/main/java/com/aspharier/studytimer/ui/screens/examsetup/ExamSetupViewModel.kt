package com.aspharier.studytimer.ui.screens.examsetup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.ExamGoalRepository
import com.aspharier.studytimer.domain.model.ExamGoal
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

data class ExamSetupUiState(
    val examName: String = "",
    val examDate: String = "", // ISO format yyyy-MM-dd
    val dailyTargetMinutes: Int = 360,
    val existingGoals: List<ExamGoal> = emptyList(),
    val isSaving: Boolean = false
) {
    val isValid: Boolean
        get() = examName.isNotBlank() && examDate.isNotBlank() && isDateInFuture

    val isDateInFuture: Boolean
        get() = try {
            val date = LocalDate.parse(examDate, DateTimeFormatter.ISO_LOCAL_DATE)
            date.isAfter(LocalDate.now())
        } catch (_: Exception) {
            false
        }

    val daysUntilExam: Long
        get() = try {
            val date = LocalDate.parse(examDate, DateTimeFormatter.ISO_LOCAL_DATE)
            ChronoUnit.DAYS.between(LocalDate.now(), date)
        } catch (_: Exception) {
            0L
        }

    val formattedDate: String
        get() = try {
            val date = LocalDate.parse(examDate, DateTimeFormatter.ISO_LOCAL_DATE)
            date.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"))
        } catch (_: Exception) {
            ""
        }

    val dailyTargetFormatted: String
        get() {
            val hours = dailyTargetMinutes / 60
            val minutes = dailyTargetMinutes % 60
            return "${hours}h ${minutes}m"
        }
}

@HiltViewModel
class ExamSetupViewModel @Inject constructor(
    private val examGoalRepository: ExamGoalRepository
) : ViewModel() {

    private val _examName = MutableStateFlow("")
    private val _examDate = MutableStateFlow("")
    private val _dailyTargetMinutes = MutableStateFlow(360)
    private val _isSaving = MutableStateFlow(false)

    private val _navigateBack = MutableSharedFlow<Unit>()
    val navigateBack: SharedFlow<Unit> = _navigateBack.asSharedFlow()

    private val existingGoals: StateFlow<List<ExamGoal>> = examGoalRepository.getAllExamGoals()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val uiState: StateFlow<ExamSetupUiState> = combine(
        _examName,
        _examDate,
        _dailyTargetMinutes,
        existingGoals,
        _isSaving
    ) { name, date, target, goals, saving ->
        ExamSetupUiState(
            examName = name,
            examDate = date,
            dailyTargetMinutes = target,
            existingGoals = goals,
            isSaving = saving
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ExamSetupUiState()
    )

    fun setExamName(name: String) {
        _examName.value = name
    }

    fun setExamDate(date: String) {
        _examDate.value = date
    }

    fun setDailyTarget(minutes: Int) {
        _dailyTargetMinutes.value = minutes.coerceIn(60, 720)
    }

    fun saveExamGoal() {
        val state = uiState.value
        if (!state.isValid || state.isSaving) return

        viewModelScope.launch {
            _isSaving.value = true
            try {
                val examGoal = ExamGoal(
                    name = state.examName.trim(),
                    examDate = state.examDate,
                    dailyTargetMinutes = state.dailyTargetMinutes,
                    isActive = true
                )
                val id = examGoalRepository.insertExamGoal(examGoal)
                examGoalRepository.setActiveExamGoal(id)
                _navigateBack.emit(Unit)
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun deleteExamGoal(id: Long) {
        viewModelScope.launch {
            examGoalRepository.deleteExamGoal(id)
        }
    }

    fun setActiveGoal(id: Long) {
        viewModelScope.launch {
            examGoalRepository.setActiveExamGoal(id)
        }
    }
}
