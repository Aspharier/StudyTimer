package com.aspharier.studytimer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exam_goals")
data class ExamGoalEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val examDate: String, // ISO date "yyyy-MM-dd"
    val dailyTargetMinutes: Int = 360, // default 6 hours
    val createdAt: Long = System.currentTimeMillis(),
    val isActive: Boolean = true
)
