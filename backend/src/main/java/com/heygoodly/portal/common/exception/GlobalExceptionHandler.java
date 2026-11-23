package com.heygoodly.portal.common.exception;

import com.heygoodly.portal.common.dto.ApiResponse;
import com.heygoodly.portal.common.i18n.service.I18nService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final I18nService i18nService;

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        ErrorCode errorCode = ex.getErrorCode();
        String message = ex.getCustomMessage() != null
                ? ex.getCustomMessage()
                : i18nService.getMessage(errorCode.getI18nKey(), locale, errorCode.getDefaultMessage());

        log.warn("Application exception at [{}]: [{}] {}", request.getRequestURI(), errorCode.name(), message);
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode.name(), message));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        String message = i18nService.getMessage(ErrorCode.RESOURCE_NOT_FOUND.getI18nKey(), locale, ex.getMessage());
        log.warn("Resource not found at [{}]: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCode.RESOURCE_NOT_FOUND.name(), message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            String field = fieldError.getField();
            String rawMessage = fieldError.getDefaultMessage();
            String code = fieldError.getCode();

            String messageKey = rawMessage;
            if (rawMessage != null && rawMessage.startsWith("{") && rawMessage.endsWith("}") && rawMessage.length() > 2) {
                messageKey = rawMessage.substring(1, rawMessage.length() - 1);
            }

            // Resolve directly from PostgreSQL i18n_messages via i18nService
            String localized = i18nService.getMessage(messageKey, locale, null);
            if (localized == null && rawMessage != null) {
                localized = i18nService.getMessage(rawMessage, locale, null);
            }
            if (localized == null && code != null) {
                localized = i18nService.getMessage("validation." + field + "." + code.toLowerCase(Locale.ROOT), locale, null);
                if (localized == null) {
                    localized = i18nService.getMessage("validation." + code.toLowerCase(Locale.ROOT), locale, null);
                }
            }

            errors.put(field, localized != null ? localized : rawMessage);
        }

        String baseMessage = i18nService.getMessage(
                ErrorCode.VALIDATION_FAILED.getI18nKey(),
                locale,
                ErrorCode.VALIDATION_FAILED.getDefaultMessage()
        );
        String detailMessage = errors.isEmpty()
                ? baseMessage
                : baseMessage + " (" + String.join("; ", errors.values()) + ")";

        log.warn("Validation failed at [{}]: {}", request.getRequestURI(), errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_FAILED.name(), detailMessage, errors));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        String message = i18nService.getMessage(
                ErrorCode.INVALID_CREDENTIALS.getI18nKey(),
                locale,
                ErrorCode.INVALID_CREDENTIALS.getDefaultMessage()
        );
        log.warn("Authentication failed at [{}]: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ErrorCode.INVALID_CREDENTIALS.name(), message));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        String message = i18nService.getMessage(
                ErrorCode.ACCESS_DENIED.getI18nKey(),
                locale,
                ErrorCode.ACCESS_DENIED.getDefaultMessage()
        );
        log.warn("Access denied at [{}]: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(ErrorCode.ACCESS_DENIED.name(), message));
    }

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiResponse<Void>> handleDomainException(DomainException ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        String message = i18nService.getMessage("error." + ex.getErrorCode().toLowerCase(Locale.ROOT), locale, ex.getMessage());
        log.warn("Domain exception at [{}]: [{}] {}", request.getRequestURI(), ex.getErrorCode(), message);
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getErrorCode(), message));
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex,
            HttpServletRequest request
    ) {
        Locale locale = resolveRequestLocale(request);
        String paramName = ex.getName();
        String message = new StringBuilder()
                .append("Invalid parameter '")
                .append(paramName)
                .append("': value '")
                .append(ex.getValue())
                .append("' is invalid.")
                .toString();

        log.warn("Parameter type mismatch at [{}]: {}", request.getRequestURI(), message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ErrorCode.VALIDATION_FAILED.name(), message));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        Locale locale = resolveRequestLocale(request);
        boolean isVi = locale != null && "vi".equalsIgnoreCase(locale.getLanguage());
        Throwable root = ex.getMostSpecificCause();
        String rawDetail = root != null && root.getMessage() != null ? root.getMessage() : (ex.getMessage() != null ? ex.getMessage() : "");
        log.warn("Database constraint violation at [{}]: {}", request.getRequestURI(), rawDetail);

        // 1. Value too long for varchar(N)
        java.util.regex.Matcher lenMatcher = java.util.regex.Pattern
                .compile("value too long for type character varying\\((\\d+)\\)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(rawDetail);
        if (lenMatcher.find()) {
            String limit = lenMatcher.group(1);
            String msg = isVi
                    ? "Có trường nhập liệu vượt quá độ dài tối đa " + limit + " ký tự (thường là Link Affiliate, Mô tả ngắn, URL ảnh hoặc Tiêu đề). Vui lòng rút ngắn lại."
                    : "A field exceeds the maximum allowed length of " + limit + " characters (commonly Affiliate URL, Short Description, Image URL, or Title). Please shorten it.";
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("VALUE_TOO_LONG", msg));
        }

        // 2. Duplicate unique key: Key (col)=(val) already exists
        java.util.regex.Matcher dupMatcher = java.util.regex.Pattern
                .compile("Key \\(([^)]+)\\)=\\(([^)]+)\\) already exists", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(rawDetail);
        if (dupMatcher.find()) {
            String col = dupMatcher.group(1).trim();
            String val = dupMatcher.group(2).trim();
            String msg = isVi
                    ? "Trường '" + col + "' với giá trị '" + val + "' đã tồn tại trong hệ thống. Vui lòng đổi sang giá trị khác."
                    : "Field '" + col + "' with value '" + val + "' already exists. Please use a different value.";
            Map<String, String> fieldErrors = new java.util.LinkedHashMap<>();
            fieldErrors.put(col, msg);
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("DUPLICATE_RESOURCE", msg, fieldErrors));
        }

        // 3. Not-null violation: null value in column "col"
        java.util.regex.Matcher nullMatcher = java.util.regex.Pattern
                .compile("null value in column \"([^\"]+)\"", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(rawDetail);
        if (nullMatcher.find()) {
            String col = nullMatcher.group(1).trim();
            String msg = isVi
                    ? "Thiếu dữ liệu bắt buộc ở trường '" + col + "'. Vui lòng điền đầy đủ trước khi lưu."
                    : "Required field '" + col + "' cannot be empty.";
            Map<String, String> fieldErrors = new java.util.LinkedHashMap<>();
            fieldErrors.put(col, msg);
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("MISSING_REQUIRED_FIELD", msg, fieldErrors));
        }

        // 4. Foreign key violation
        if (rawDetail.toLowerCase(Locale.ROOT).contains("foreign key constraint")) {
            String msg = isVi
                    ? "Dữ liệu liên kết (Chuyên mục / Thương hiệu / Người dùng) không còn tồn tại hoặc không hợp lệ. Vui lòng chọn lại."
                    : "A referenced record (Category / Store / User) is invalid or was deleted. Please re-select it.";
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("INVALID_REFERENCE", msg));
        }

        String message = i18nService.getMessage(
                "error.resource_conflict",
                locale,
                "A record with this identifier or unique attribute already exists."
        );
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("RESOURCE_CONFLICT", message));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex,
            HttpServletRequest request
    ) {
        log.warn("Resource not found at [{}]: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ErrorCode.RESOURCE_NOT_FOUND.name(), "Resource not found: " + ex.getResourcePath()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex, HttpServletRequest request) {
        Locale locale = resolveRequestLocale(request);
        log.error("Unhandled exception processing request [{}]: ", request.getRequestURI(), ex);
        String message = i18nService.getMessage(
                ErrorCode.INTERNAL_SERVER_ERROR.getI18nKey(),
                locale,
                ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage()
        );
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.name(), message));
    }

    private Locale resolveRequestLocale(HttpServletRequest request) {
        if (request != null) {
            String xLocale = request.getHeader("X-Locale");
            if (xLocale != null && !xLocale.isBlank()) {
                return Locale.of(xLocale.trim().toLowerCase(Locale.ROOT));
            }
            String acceptLang = request.getHeader("Accept-Language");
            if (acceptLang != null && !acceptLang.isBlank()) {
                String primaryLang = acceptLang.split("[,;]")[0].trim().split("-")[0].toLowerCase(Locale.ROOT);
                return Locale.of(primaryLang);
            }
        }
        return LocaleContextHolder.getLocale();
    }
}
