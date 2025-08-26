package com.llmaudio.app.model

import com.llmaudio.app.data.model.MetricData
import com.llmaudio.app.data.model.MetricType

data class MetricItem(
    val type: MetricType,
    val data: MetricData
)
