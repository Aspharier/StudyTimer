package com.aspharier.studytimer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.aspharier.studytimer.data.local.entity.StudySessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface StudySessionDao {
    @Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun insert(session: StudySessionEntity): Long

    @Insert(onConflict = androidx.room.OnConflictStrategy.REPLACE)
    suspend fun update(session: StudySessionEntity)

    @Query("DELETE FROM study_sessions WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM study_sessions WHERE date = :date ORDER BY startTime ASC")
    fun getSessionsByDate(date: String): Flow<List<StudySessionEntity>>

    @Query("SELECT * FROM study_sessions ORDER BY date DESC, startTime ASC")
    fun getAllSessions(): Flow<List<StudySessionEntity>>

    @Query("SELECT DISTINCT date FROM study_sessions ORDER BY date DESC")
    fun getAllDates(): Flow<List<String>>

    @Query("SELECT * FROM study_sessions WHERE id = :id")
    suspend fun getSessionById(id: Long): StudySessionEntity?

    @Query("SELECT SUM(completedDurationSeconds) FROM study_sessions WHERE date = :date")
    fun getTotalSecondsForDate(date: String): Flow<Long?>
}
