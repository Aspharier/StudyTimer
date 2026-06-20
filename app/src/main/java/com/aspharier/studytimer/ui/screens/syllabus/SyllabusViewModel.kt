package com.aspharier.studytimer.ui.screens.syllabus

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aspharier.studytimer.data.repository.ExamGoalRepository
import com.aspharier.studytimer.data.repository.SyllabusRepository
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.Topic
import com.aspharier.studytimer.domain.model.TopicStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SyllabusUiState(
    val subjects: List<Subject> = emptyList(),
    val topicsBySubject: Map<Long, List<Topic>> = emptyMap(),
    val activeExamGoalId: Long? = null,
    val overallCompletion: Float = 0f
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class SyllabusViewModel @Inject constructor(
    private val syllabusRepository: SyllabusRepository,
    private val examGoalRepository: ExamGoalRepository
) : ViewModel() {

    private val _topicsBySubject = MutableStateFlow<Map<Long, List<Topic>>>(emptyMap())

    private val activeExamGoal = examGoalRepository.getActiveExamGoal()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val subjects: StateFlow<List<Subject>> = activeExamGoal
        .flatMapLatest { goal ->
            if (goal != null) {
                syllabusRepository.getSubjectsByExamGoal(goal.id)
            } else {
                flowOf(emptyList())
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val uiState: StateFlow<SyllabusUiState> = combine(
        subjects,
        _topicsBySubject,
        activeExamGoal
    ) { subjectList, topicsMap, examGoal ->
        val totalTopics = subjectList.sumOf { it.totalTopics }
        val completedTopics = subjectList.sumOf { it.completedTopics }
        val overall = if (totalTopics > 0) completedTopics.toFloat() / totalTopics else 0f

        SyllabusUiState(
            subjects = subjectList,
            topicsBySubject = topicsMap,
            activeExamGoalId = examGoal?.id,
            overallCompletion = overall
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SyllabusUiState()
    )

    fun loadTopicsForSubject(subjectId: Long) {
        viewModelScope.launch {
            syllabusRepository.getTopicsBySubject(subjectId).collect { topics ->
                _topicsBySubject.update { current ->
                    current + (subjectId to topics)
                }
            }
        }
    }

    fun unloadTopicsForSubject(subjectId: Long) {
        _topicsBySubject.update { current ->
            current - subjectId
        }
    }

    fun addSubject(name: String, colorHex: String) {
        val goalId = uiState.value.activeExamGoalId ?: return
        viewModelScope.launch {
            syllabusRepository.insertSubject(
                Subject(
                    name = name,
                    examGoalId = goalId,
                    colorHex = colorHex,
                    sortOrder = uiState.value.subjects.size
                )
            )
        }
    }

    fun updateSubject(subject: Subject) {
        viewModelScope.launch {
            syllabusRepository.updateSubject(subject)
        }
    }

    fun deleteSubject(subjectId: Long) {
        viewModelScope.launch {
            unloadTopicsForSubject(subjectId)
            syllabusRepository.deleteSubject(subjectId)
        }
    }

    fun addTopic(name: String, subjectId: Long) {
        val currentTopics = _topicsBySubject.value[subjectId]
        viewModelScope.launch {
            syllabusRepository.insertTopic(
                Topic(
                    name = name,
                    subjectId = subjectId,
                    sortOrder = currentTopics?.size ?: 0
                )
            )
        }
    }

    fun deleteTopic(topicId: Long) {
        viewModelScope.launch {
            syllabusRepository.deleteTopic(topicId)
        }
    }

    fun updateTopicStatus(topicId: Long, newStatus: TopicStatus) {
        viewModelScope.launch {
            syllabusRepository.updateTopicStatus(topicId, newStatus)
        }
    }

    fun cycleTopicStatus(topic: Topic) {
        val nextStatus = when (topic.status) {
            TopicStatus.NOT_STARTED -> TopicStatus.IN_PROGRESS
            TopicStatus.IN_PROGRESS -> TopicStatus.COMPLETED
            TopicStatus.COMPLETED -> TopicStatus.NEEDS_REVISION
            TopicStatus.NEEDS_REVISION -> TopicStatus.NOT_STARTED
        }
        updateTopicStatus(topic.id, nextStatus)
    }
}
