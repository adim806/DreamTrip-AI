import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import fieldComponentMap from './FieldComponents';
import './MissingFieldsForm.css';

/**
 * MissingFieldsForm component renders a form for collecting missing trip details
 * 
 * This component displays a form with fields for any missing required information
 * needed to complete trip planning. It's designed to be compact and fit well within
 * the chat flow.
 */
const MissingFieldsForm = ({ 
  missingFields = [], 
  onSubmit, 
  onCancel,
  initialValues = {},
  title = "Complete Your Trip Details",
  duration = null,
  fields = [], // Backward compatibility for older code
  submitLabel = "Submit" // Allow customizing the submit button text
}) => {
  // Initialize form state with any provided initial values
  const [formValues, setFormValues] = useState({});
  
  // Initialize form validation state
  const [formErrors, setFormErrors] = useState({});
  
  // Track if the form has been submitted
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Track if submission is in progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track currently focused field
  const [focusedField, setFocusedField] = useState(null);
  
  // Process fields from either missingFields or fields prop
  const processedFields = React.useMemo(() => {
    // If missingFields array has items, use it
    if (missingFields && missingFields.length > 0) {
      return missingFields;
    }
    
    // Otherwise, convert the older fields format to the new format
    if (fields && fields.length > 0) {
      return fields.map(fieldName => ({
        id: fieldName,
        label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, " "),
        required: true,
        type: 'text'
      }));
    }
    
    // FALLBACK: If no fields provided, show some default fields for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('No fields provided to MissingFieldsForm, using test fields');
      return [
        { id: 'destination', label: 'Destination', required: true, type: 'text' },
        { id: 'dates', label: 'Travel Dates', required: true, type: 'text' },
        { id: 'budget', label: 'Budget', required: true, type: 'text' }
      ];
    }
    
    return [];
  }, [missingFields, fields]);

  // Set up initial values when the component mounts or when initialValues changes
  useEffect(() => {
    const initialFormValues = {};
    
    // Initialize all fields with empty strings or provided initial values
    processedFields.forEach(field => {
      const fieldId = typeof field === 'string' ? field : field.id;
      initialFormValues[fieldId] = initialValues[fieldId] || '';
    });
    
    setFormValues(initialFormValues);
  }, [processedFields, initialValues]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Handle custom field component changes
  const handleFieldChange = (fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[fieldId]) {
      setFormErrors(prev => ({
        ...prev,
        [fieldId]: null
      }));
    }
  };

  // Validate the form
  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    processedFields.forEach(field => {
      const fieldId = typeof field === 'string' ? field : field.id;
      const fieldLabel = typeof field === 'string' 
        ? fieldId.charAt(0).toUpperCase() + fieldId.slice(1).replace(/_/g, " ")
        : field.label;
      const isRequired = typeof field === 'string' ? true : field.required;
      
      if (isRequired && !formValues[fieldId]?.toString().trim()) {
        errors[fieldId] = `${fieldLabel} is required`;
        isValid = false;
      }
    });
    
    setFormErrors(errors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      // Call onSubmit with the form values
      try {
        onSubmit(formValues);
        
        // Reset form after successful submission
        setTimeout(() => {
          setIsSubmitting(false);
        }, 500);
      } catch (error) {
        console.error('Error submitting form:', error);
        setIsSubmitting(false);
      }
    }
  };
  
  // Handle field focus
  const handleFocus = (fieldId) => {
    setFocusedField(fieldId);
  };
  
  // Handle field blur
  const handleBlur = () => {
    setFocusedField(null);
  };

  // If no fields to display, don't render the form
  if (!processedFields || processedFields.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="missing-fields-form"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className="status-dot"></span>
        {title}
      </motion.h3>
      
      <form onSubmit={handleSubmit} className="fields-form">
        <div className="fields-container">
          <AnimatePresence>
            {processedFields.map((field, index) => {
              const fieldId = typeof field === 'string' ? field : field.id;
              const fieldLabel = typeof field === 'string' 
                ? fieldId.charAt(0).toUpperCase() + fieldId.slice(1).replace(/_/g, " ")
                : field.label;
              const fieldType = typeof field === 'string' ? 'text' : (field.type || 'text');
              const isRequired = typeof field === 'string' ? true : field.required;
              const placeholder = typeof field === 'string' 
                ? `Enter ${fieldLabel.toLowerCase()}`
                : (field.placeholder || `Enter ${fieldLabel.toLowerCase()}`);
                
              // Check if we have a specialized component for this field type
              const FieldComponent = fieldComponentMap[fieldId];
              
              if (FieldComponent) {
                // Pass duration prop to DateInput component if the field is 'dates'
                const extraProps = fieldId === 'dates' ? { duration } : {};
                
                return (
                  <motion.div 
                    key={fieldId}
                    className="field-item"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.2 }}
                  >
                    <FieldComponent
                      value={formValues[fieldId] || ""}
                      onComplete={(value) => handleFieldChange(fieldId, value)}
                      label={fieldLabel}
                      error={formErrors[fieldId] && isSubmitted ? formErrors[fieldId] : null}
                      {...extraProps}
                    />
                  </motion.div>
                );
              }
              
              return (
                <motion.div 
                  key={fieldId} 
                  className={`field-item ${focusedField === fieldId ? 'focused' : ''}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.2 }}
                >
                  <label htmlFor={fieldId}>
                    {fieldLabel}
                    {isRequired && <span className="required-mark">*</span>}
                  </label>
                  
                  <input
                    type={fieldType}
                    id={fieldId}
                    name={fieldId}
                    value={formValues[fieldId] || ''}
                    onChange={handleInputChange}
                    onFocus={() => handleFocus(fieldId)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className={formErrors[fieldId] && isSubmitted ? 'error' : ''}
                  />
                  
                  <AnimatePresence>
                    {formErrors[fieldId] && isSubmitted && (
                      <motion.div 
                        className="error-message"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {formErrors[fieldId]}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        <motion.div 
          className="form-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {onCancel && (
            <motion.button 
              type="button" 
              onClick={onCancel}
              className="cancel-button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={isSubmitting}
            >
              Cancel
            </motion.button>
          )}
          
          <motion.button 
            type="submit" 
            className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
            whileHover={!isSubmitting ? { scale: 1.03, boxShadow: "0 3px 8px rgba(59, 130, 246, 0.3)" } : {}}
            whileTap={!isSubmitting ? { scale: 0.97 } : {}}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading-spinner"></span>
            ) : submitLabel}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
};

// Add a TestForm component for direct testing
export const TestMissingFieldsForm = () => {
  const testFields = [
    { id: 'destination', label: 'Destination', required: true, type: 'text' },
    { id: 'dates', label: 'Travel Dates', required: true, type: 'text' },
    { id: 'budget', label: 'Budget', required: true, type: 'text' }
  ];
  
  const handleSubmit = (values) => {
    console.log('Test form submitted with values:', values);
    alert('Form submitted: ' + JSON.stringify(values));
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Test Missing Fields Form</h2>
      <MissingFieldsForm 
        missingFields={testFields} 
        onSubmit={handleSubmit}
        title="Complete Trip Details"
      />
    </div>
  );
};

export default MissingFieldsForm; 