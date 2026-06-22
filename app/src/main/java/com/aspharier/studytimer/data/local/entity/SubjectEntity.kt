package com.aspharier.studytimer.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "subjects",
    foreignKeys = [
        ForeignKey(
            entity = ExamGoalEntity::class,
            parentColumns = ["id"],
            childColumns = ["examGoalId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("examGoalId")]
)
data class SubjectEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val examGoalId: Long,
    val colorHex: String = "#4D96FF", // default blue
    val sortOrder: Int = 0,
    val targetHours: Int? = null,
    val priority: String = "MEDIUM"
)
