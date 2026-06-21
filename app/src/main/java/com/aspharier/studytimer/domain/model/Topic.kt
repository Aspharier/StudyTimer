package com.aspharier.studytimer.domain.model

data class Topic(
    val id: Long = 0,
    val name: String,
    val subjectId: Long,
    val status: TopicStatus = TopicStatus.NOT_STARTED,
    val sortOrder: Int = 0,
    val subTopics: List<SubTopic> = emptyList()
)
