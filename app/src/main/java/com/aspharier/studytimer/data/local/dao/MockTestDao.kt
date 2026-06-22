package com.aspharier.studytimer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.aspharier.studytimer.data.local.entity.MockTestEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MockTestDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(test: MockTestEntity): Long

    @Query("SELECT * FROM mock_tests WHERE examGoalId = :examGoalId ORDER BY date DESC")
    fun getMockTestsForGoal(examGoalId: Long): Flow<List<MockTestEntity>>

    @Query("SELECT AVG(scorePercentage) FROM mock_tests WHERE subjectId = :subjectId")
    fun getAverageScoreForSubject(subjectId: Long): Flow<Float?>
    
    @Query("SELECT * FROM mock_tests")
    fun getAllMockTests(): Flow<List<MockTestEntity>>

    @Query("DELETE FROM mock_tests WHERE id = :id")
    suspend fun deleteById(id: Long)
}
