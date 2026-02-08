// Centralized validation utilities

// Email validation with proper regex
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
};

// CPF validation (already exists in main file, centralizing here)
export const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
};

// Phone validation (Brazilian format)
export const validatePhone = (phone: string): boolean => {
    const phoneDigits = phone.replace(/\D/g, '');
    // Must be 10 (landline) or 11 (mobile) digits
    return phoneDigits.length === 10 || phoneDigits.length === 11;
};

// Date validation
export const validateBirthDate = (dateStr: string): { valid: boolean; error?: string } => {
    if (!dateStr) return { valid: false, error: 'Data de nascimento é obrigatória' };

    const date = new Date(dateStr);
    const today = new Date();

    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Data inválida' };
    }

    if (date > today) {
        return { valid: false, error: 'Data de nascimento não pode ser no futuro' };
    }

    // Check if person is not too old (e.g., 150 years)
    const age = today.getFullYear() - date.getFullYear();
    if (age > 150) {
        return { valid: false, error: 'Data de nascimento inválida' };
    }

    return { valid: true };
};

// Appointment date validation
export const validateAppointmentDate = (dateStr: string, timeStr: string): { valid: boolean; error?: string } => {
    if (!dateStr || !timeStr) {
        return { valid: false, error: 'Data e hora são obrigatórias' };
    }

    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();

    if (isNaN(appointmentDateTime.getTime())) {
        return { valid: false, error: 'Data/hora inválida' };
    }

    if (appointmentDateTime < now) {
        return { valid: false, error: 'Agendamento não pode ser no passado' };
    }

    // Check if appointment is too far in the future (e.g., 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (appointmentDateTime > oneYearFromNow) {
        return { valid: false, error: 'Agendamento não pode ser com mais de 1 ano de antecedência' };
    }

    return { valid: true };
};

// Text sanitization (prevent XSS)
export const sanitizeText = (text: string, maxLength: number = 5000): string => {
    if (!text) return '';

    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
};

// Name validation
export const validateName = (name: string): { valid: boolean; error?: string } => {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Nome é obrigatório' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
        return { valid: false, error: 'Nome deve ter pelo menos 3 caracteres' };
    }

    if (trimmedName.length > 100) {
        return { valid: false, error: 'Nome muito longo (máximo 100 caracteres)' };
    }

    // Check if name has at least one space (first + last name)
    if (!trimmedName.includes(' ')) {
        return { valid: false, error: 'Por favor, informe nome e sobrenome' };
    }

    return { valid: true };
};

// Password validation
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (!password) {
        return { valid: false, error: 'Senha é obrigatória' };
    }

    if (password.length < 6) {
        return { valid: false, error: 'Senha deve ter pelo menos 6 caracteres' };
    }

    if (password.length > 100) {
        return { valid: false, error: 'Senha muito longa (máximo 100 caracteres)' };
    }

    return { valid: true };
};

// Admin email whitelist (SECURITY FIX)
const ADMIN_EMAILS = [
    'licitadigitaltech@gmail.com',
    // Add more admin emails here as needed
];

export const isAdminEmail = (email: string): boolean => {
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};

// Form validation helper
export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

export const validateForm = (
    fields: Record<string, any>,
    rules: Record<string, (value: any) => { valid: boolean; error?: string }>
): ValidationResult => {
    const errors: Record<string, string> = {};

    for (const [fieldName, validator] of Object.entries(rules)) {
        const result = validator(fields[fieldName]);
        if (!result.valid && result.error) {
            errors[fieldName] = result.error;
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
};
