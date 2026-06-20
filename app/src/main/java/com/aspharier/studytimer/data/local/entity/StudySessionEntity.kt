package com.aspharier.studytimer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "study_sessions")
data class StudySessionEntity(
    @PrimaryKey(autoGenerate = true)
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