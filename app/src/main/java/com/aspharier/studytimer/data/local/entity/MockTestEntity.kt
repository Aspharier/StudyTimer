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
        ),
        ForeignKey(
            entity = TopicEntity::class,
            parentColumns = ["id"],
            childColumns = ["topicId"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [Index("subjectId"), Index("examGoalId"), Index("topicId")]
)
data class MockTestEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val examGoalId: Long,
    val subjectId: Long,
    val topicId: Long? = null,
    val testName: String,
    val scorePercentage: Float, // 0.0 to 100.0
    val totalMarks: Float,
    val obtainedMarks: Float,
    val notes: String? = null,
    val date: String, // "yyyy-MM-dd"
    val createdAt: Long = System.currentTimeMillis(),
    // Questions breakdown
    val totalQuestions: Int = 0,
    val attempted1Mark: Int = 0,
    val attempted2Mark: Int = 0,
    val notAttempted: Int = 0,
    // Marks breakdown
    val correctMarks: Float = 0f,
    val penaltyMarks: Float = 0f,
    val netMarks: Float = 0f,
    // Time tracking (minutes)
    val totalTimeMinutes: Int = 0,
    val timeTakenMinutes: Int = 0
)
