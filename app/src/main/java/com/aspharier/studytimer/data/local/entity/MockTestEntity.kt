package com.aspharier.studytimer.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "mock_tests",
    foreignKeys = [
        ForeignKey(
            entity = SubjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["subjectId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ExamGoalEntity::class,
            parentColumns = ["id"],
            childColumns = ["examGoalId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("subjectId"), Index("examGoalId")]
)
data class MockTestEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val examGoalId: Long,
    val subjectId: Long,
    val testName: String,
    val scorePercentage: Float, // 0.0 to 100.0
    val totalMarks: Float,
    val obtainedMarks: Float,
    val notes: String? = null,
    val date: String, // "yyyy-MM-dd"
    val createdAt: Long = System.currentTimeMillis()
)
