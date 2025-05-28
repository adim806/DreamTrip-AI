import React, { useState, useEffect, useRef } from "react";
import fieldComponentMap from "./FieldComponents";
import { motion } from "framer-motion";

/**
 * MissingFieldsForm - A component that renders a form for collecting missing fields
 * 
 * @param {Object} props
 * @param {Array} props.fields - Array of field names that need to be collected
 * @param {Object} props.initialValues - Initial values for the fields
 * @param {Function} props.onSubmit - Function to call when the form is submitted
 * @param {String} props.submitLabel - Label for the submit button
 * @param {String} props.intent - The intent that requires these fields (optional)
 */
const MissingFieldsForm = React.memo(function MissingFieldsForm({ 
  fields = [], 
  initialValues = {}, 
  onSubmit,
  submitLabel = "שלח",
  intent = null
}) {
  const [formValues, setFormValues] = useState(initialValues || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSubmittedRef = useRef(false);
  const previousFieldsRef = useRef([]);
  const previousInitialValuesRef = useRef({});
  const formMountedRef = useRef(false);
  
  // Track if this is the first render - only runs once on mount
  useEffect(() => {
    formMountedRef.current = true;
    
    // Cleanup function to prevent memory leaks
    return () => {
      formMountedRef.current = false;
    };
  }, []);
  
  // Initialize form values from initialValues when they change
  useEffect(() => {
    // Skip if the form is already submitted
    if (formSubmittedRef.current || initialValues?.submitted === true) {
      return;
    }
    
    // Only update if initialValues actually changed
    const prevValues = previousInitialValuesRef.current;
    const valuesChanged = JSON.stringify(prevValues) !== JSON.stringify(initialValues);
    
    if (valuesChanged && initialValues && Object.keys(initialValues).length > 0) {
      previousInitialValuesRef.current = {...initialValues};
      setFormValues(prev => ({
        ...prev,
        ...initialValues
      }));
    }
  }, [initialValues]);
  
  // Reset submission state when fields change
  useEffect(() => {
    // Skip if the form is already submitted
    if (initialValues?.submitted === true) {
      formSubmittedRef.current = true;
      return;
    }
    
    // Check if fields actually changed using the ref
    const prevFields = previousFieldsRef.current;
    const fieldsChanged = 
      prevFields.length !== fields.length || 
      fields.some((field, i) => prevFields[i] !== field);
    
    if (!fieldsChanged) {
      return;
    }
    
    // Update previous fields ref
    previousFieldsRef.current = [...fields];
    
    if (fields?.length > 0 && formSubmittedRef.current) {
      return;
    }
    
    formSubmittedRef.current = false;
    setIsSubmitting(false);
  }, [fields, initialValues]);

  // If no fields, don't render the form
  if (!fields || fields.length === 0) {
    return null;
  }
  
  // If form was already submitted, don't render it again
  if (formSubmittedRef.current || initialValues?.submitted === true) {
    return null;
  }

  const handleFieldChange = (field, value) => {
    if (formSubmittedRef.current) {
      return;
    }
    
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting || formSubmittedRef.current) {
      return;
    }
    
    setIsSubmitting(true);
    formSubmittedRef.current = true;
    
    // Check if we have values for all fields
    const allFieldsHaveValues = fields.every(field => 
      formValues[field] !== undefined && formValues[field] !== ""
    );
    
    if (!allFieldsHaveValues) {
      setIsSubmitting(false);
      formSubmittedRef.current = false;
      return;
    }
    
    // Call onSubmit with the form values
    try {
      // Mark form as submitted BEFORE calling onSubmit to prevent loops
      const submissionValues = {...formValues};
      
      // Clear the form after successful submission
      setFormValues({});
      
      // Call onSubmit with the values we captured
      if (typeof onSubmit === 'function') {
        onSubmit(submissionValues);
      } else {
        console.error("[MissingFieldsForm] onSubmit is not a function:", onSubmit);
      }
    } catch (error) {
      console.error("[MissingFieldsForm] Error submitting form:", error);
      setIsSubmitting(false);
      formSubmittedRef.current = false;
    }
  };

  // Return the form UI
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="missing-fields-form bg-gradient-to-r from-[#293348] to-[#2d3346] rounded-lg p-4 border border-blue-500/30 shadow-lg"
    >
      <h3 className="text-blue-300 font-medium mb-3">
        {intent ? `Complete information for ${intent.replace(/-/g, " ")}` : "Please provide the missing information"}
      </h3>
      
      <form onSubmit={handleSubmit}>
        {fields.map(field => {
          const FieldComponent = fieldComponentMap[field];
          
          if (!FieldComponent) {
            return (
              <div key={field} className="mb-3">
                <label className="block text-blue-300 font-medium mb-1">{field}:</label>
                <input
                  type="text"
                  value={formValues[field] || ""}
                  onChange={e => handleFieldChange(field, e.target.value)}
                  className="w-full px-3 py-2 bg-[#23263a] border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder={`Enter ${field}`}
                />
              </div>
            );
          }
          
          return (
            <FieldComponent
              key={field}
              value={formValues[field] || ""}
              onComplete={value => handleFieldChange(field, value)}
              label={field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")}
            />
          );
        })}
        
        <div className="mt-4 flex justify-end">
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={isSubmitting}
            type="submit"
            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all duration-200 flex items-center ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              submitLabel
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
});

export default MissingFieldsForm; 