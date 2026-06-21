package com.aspharier.studytimer.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "topics",
    foreignKeys = [
        ForeignKey(
            entity = SubjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["subjectId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("subjectId")]
)
data class TopicEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val subjectId: Long,
    val status: String = "NOT_STARTED", // NOT_STARTED, IN_PROGRESS, COMPLETED, NEEDS_REVISION
    val sortOrder: Int = 0,
    val subTopicsJson: String? = null
)

// JSON helper extensions for SubTopics serialization/deserialization
fun List<com.aspharier.studytimer.domain.model.SubTopic>.toJsonString(): String {
    val array = org.json.JSONArray()
    forEach { subTopic ->
        val obj = org.json.JSONObject()
        obj.put("id", subTopic.id)
        obj.put("name", subTopic.name)
        obj.put("status", subTopic.status.name)
        array.put(obj)
    }
    return array.toString()
}

fun String?.toSubTopicsList(): List<com.aspharier.studytimer.domain.model.SubTopic> {
    if (this.isNullOrBlank()) return emptyList()
    val list = mutableListOf<com.aspharier.studytimer.domain.model.SubTopic>()
    try {
        val array = org.json.JSONArray(this)
        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)
            val id = obj.optString("id") ?: ""
            val name = obj.optString("name") ?: ""
            val statusStr = obj.optString("status", "NOT_STARTED")
            val status = runCatching { com.aspharier.studytimer.domain.model.TopicStatus.valueOf(statusStr) }
                .getOrDefault(com.aspharier.studytimer.domain.model.TopicStatus.NOT_STARTED)
            list.add(com.aspharier.studytimer.domain.model.SubTopic(id = id, name = name, status = status))
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return list
}
