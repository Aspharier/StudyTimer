package com.aspharier.studytimer.domain.model

data class StudySession(
    val id: Long = 0,
    val label: String,
    val durationMinutes: Int,
    val completedDurationSeconds: Long,
    val date: String,
    val startTime: Long,
    val endTime: Long? = null,
    val isCompleted: Boolean = false,
    val notes: String? = null,
    val tag: String? = null,
    val subjectId: Long? = null
)

data class DailySessions(
    val date: String,
    val sessions: List<StudySession>,
    val totalMinutes: Int
)