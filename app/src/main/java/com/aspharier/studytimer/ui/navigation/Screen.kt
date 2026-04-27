package com.aspharier.studytimer.ui.navigation

import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.res.vectorResource
import com.aspharier.studytimer.R

sealed class Screen(
    val route: String,
    val title: String,
    val icon: @Composable () -> Unit = {}
) {
    data object Home : Screen(
        route = "home",
        title = "Timer",
        icon = { Text("T") }
    )

    data object Timer : Screen(
        route = "timer/{sessionId}",
        title = "Study",
        icon = { Text("S") }
    ) {
        fun createRoute(sessionId: Long) = "timer/$sessionId"
    }

    data object History : Screen(
        route = "history",
        title = "History",
        icon = { Text("H") }
    )
}