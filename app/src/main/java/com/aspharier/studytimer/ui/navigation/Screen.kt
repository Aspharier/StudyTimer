package com.aspharier.studytimer.ui.navigation

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

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

    data object Profile : Screen(
        route = "profile",
        title = "Profile",
        icon = { Text("P") }
    )
}
