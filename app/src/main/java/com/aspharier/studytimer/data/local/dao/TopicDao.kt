package com.aspharier.studytimer.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.aspharier.studytimer.data.local.entity.TopicEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TopicDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(topic: TopicEntity): Long

    @Update
    suspend fun update(topic: TopicEntity)

    @Query("DELETE FROM topics WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM topics WHERE subjectId = :subjectId ORDER BY sortOrder ASC")
    fun getTopicsBySubject(subjectId: Long): Flow<List<TopicEntity>>

    @Query("SELECT * FROM topics WHERE id = :id")
    suspend fun getTopicById(id: Long): TopicEntity?

    @Query("UPDATE topics SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: Long, status: String)

    @Query("SELECT COUNT(*) FROM topics WHERE subjectId = :subjectId")
    fun getTopicCount(subjectId: Long): Flow<Int>

    @Query("SELECT COUNT(*) FROM topics WHERE subjectId = :subjectId AND status = 'COMPLETED'")
    fun getCompletedTopicCount(subjectId: Long): Flow<Int>

    @Query("SELECT * FROM topics")
    fun getAllTopics(): Flow<List<TopicEntity>>
}
