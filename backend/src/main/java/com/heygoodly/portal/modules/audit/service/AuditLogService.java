package com.heygoodly.portal.modules.audit.service;

import com.heygoodly.portal.common.dto.PageResponse;
import com.heygoodly.portal.modules.audit.dto.request.AuditLogQueryCriteria;
import com.heygoodly.portal.modules.audit.dto.request.CreateAuditLogRequest;
import com.heygoodly.portal.modules.audit.dto.response.AuditLogResponse;
import com.heygoodly.portal.modules.audit.dto.response.AuditStatsResponse;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public interface AuditLogService {

    void recordLog(CreateAuditLogRequest request);

    void recordAction(
            String action,
            String module,
            String resourceId,
            String resourceName,
            List<Map<String, Object>> changes
    );

    static void appendDiff(
            List<Map<String, Object>> diffs,
            String field,
            String label,
            Object before,
            Object after
    ) {
        String prevStr = before != null ? String.valueOf(before) : "";
        String nextStr = after != null ? String.valueOf(after) : "";
        if (Objects.equals(prevStr, nextStr)) {
            return;
        }
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("field", field);
        item.put("label", label);
        item.put("before", before);
        item.put("after", after);
        diffs.add(item);
    }

    PageResponse<AuditLogResponse> getAuditLogs(AuditLogQueryCriteria criteria);

    AuditLogResponse getAuditLogById(Long id);

    AuditStatsResponse getAuditStats();
}
