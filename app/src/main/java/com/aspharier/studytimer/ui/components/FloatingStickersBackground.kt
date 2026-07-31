package com.aspharier.studytimer.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex

@Composable
fun FloatingStickersBackground(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "stickers_drift")
    val offsetY by infiniteTransition.animateFloat(
        initialValue = -12f,
        targetValue = 12f,
        animationSpec = infiniteRepeatable(
            animation = tween(3500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "offset_y"
    )

    Box(modifier = modifier.fillMaxSize()) {
        // Main Screen Content
        content()

        // Floating Stickers Overlay (on top of screen background)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .zIndex(100f)
                .alpha(0.85f)
        ) {
            Text("✿", fontSize = 32.sp, color = Color(0xFFFF7AB6), modifier = Modifier.padding(start = 20.dp, top = 70.dp + offsetY.dp))
            Text("⭐", fontSize = 28.sp, modifier = Modifier.align(Alignment.TopEnd).padding(end = 24.dp, top = 80.dp - offsetY.dp))
            Text("🎀", fontSize = 30.sp, modifier = Modifier.padding(start = 14.dp, top = 260.dp - offsetY.dp))
            Text("✨", fontSize = 26.sp, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 16.dp))
            Text("☁️", fontSize = 32.sp, modifier = Modifier.padding(start = 24.dp, top = 520.dp + offsetY.dp))
            Text("🌸", fontSize = 28.sp, modifier = Modifier.align(Alignment.BottomEnd).padding(end = 32.dp, bottom = 140.dp - offsetY.dp))
            Text("🍬", fontSize = 28.sp, modifier = Modifier.align(Alignment.BottomStart).padding(start = 32.dp, bottom = 90.dp + offsetY.dp))
            Text("🌷", fontSize = 30.sp, modifier = Modifier.align(Alignment.CenterStart).padding(start = 10.dp))
        }
    }
}
