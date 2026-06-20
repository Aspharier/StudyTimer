package com.aspharier.studytimer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.aspharier.studytimer.data.local.entity.ExamGoalEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ExamGoalDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(examGoal: ExamGoalEntity): Long

    @Update
    suspend fun update(examGoal: ExamGoalEntity)

    @Query("DELETE FROM exam_goals WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM exam_goals WHERE isActive = 1 ORDER BY examDate ASC LIMIT 1")
    fun getActiveExamGoal(): Flow<ExamGoalEntity?>

    @Query("SELECT * FROM exam_goals ORDER BY createdAt DESC")
    fun getAllExamGoals(): Flow<List<ExamGoalEntity>>

    @Query("SELECT * FROM exam_goals WHERE id = :id")
    suspend fun getExamGoalById(id: Long): ExamGoalEntity?

    @Query("UPDATE exam_goals SET isActive = 0")
    suspend fun deactivateAll()

    @Query("UPDATE exam_goals SET isActive = 1 WHERE id = :id")
    suspend fun activate(id: Long)
}
