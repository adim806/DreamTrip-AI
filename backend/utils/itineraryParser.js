/**
 * Utility functions for parsing and processing itinerary content
 */

/**
 * Parse raw content into a structured itinerary format
 * @param {string} rawContent - The raw text content of the itinerary
 * @returns {object} Structured itinerary data
 */
function parseRawContent(rawContent) {
  if (!rawContent) return null;
  
  const structuredData = {
    destination: extractDestination(rawContent),
    duration: extractDuration(rawContent),
    days: [],
    additionalInfo: {
      tips: extractTips(rawContent),
      warnings: [],
      budgetNotes: extractBudgetInfo(rawContent),
      packingList: [],
      localCustoms: [],
      emergencyContacts: []
    },
    highlights: extractHighlights(rawContent),
    summary: extractSummary(rawContent)
  };
  
  // Extract days and activities
  structuredData.days = extractDays(rawContent);
  
  return structuredData;
}

/**
 * Extract destination from raw content
 * @param {string} content 
 * @returns {string}
 */
function extractDestination(content) {
  // Try various patterns to find destination
  const patterns = [
    /(?:יעד|destination):\s*([^\n]+)/i,
    /(?:מיקום|location):\s*([^\n]+)/i,
    /טיול ב([^\n]+)/i,
    /טיול ל([^\n]+)/i,
    /Trip to ([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return cleanDestinationName(match[1].trim());
    }
  }
  
  // Try to find destination in first 10 lines
  const lines = content.split('\n').slice(0, 10);
  for (const line of lines) {
    if (line.includes("יעד") || 
        line.includes("destination") || 
        line.includes("מיקום") || 
        line.includes("location")) {
      const words = line.split(':');
      if (words.length > 1) {
        return cleanDestinationName(words[1].trim());
      }
    }
  }
  
  return "Unknown destination";
}

/**
 * Clean destination name from formatting or extra text
 * @param {string} rawDestination 
 * @returns {string}
 */
function cleanDestinationName(rawDestination) {
  if (!rawDestination) return "";
  
  // Remove markdown formatting
  let cleaned = rawDestination
    .replace(/\*\*/g, '')  // Remove bold markers
    .replace(/\*/g, '')    // Remove italic markers
    .replace(/\#\s+/g, '') // Remove headings
    .replace(/\<[^>]*\>/g, ''); // Remove HTML tags
    
  // If it still contains structured data indicators after cleaning
  if (cleaned.includes('{') || cleaned.includes('[')) {
    try {
      // Try to parse if it's JSON
      const parsed = JSON.parse(cleaned);
      if (parsed.destination) return parsed.destination;
      if (parsed.name) return parsed.name;
      if (parsed.city) return parsed.city;
    } catch (e) {
      // Not valid JSON, continue with other cleaning methods
      // Extract just the first word that looks like a place name
      const placeMatch = cleaned.match(/([A-Za-z\u0590-\u05FF]+(?:\s+[A-Za-z\u0590-\u05FF]+){0,2})/);
      if (placeMatch) {
        return placeMatch[1];
      }
    }
  }
  
  // If destination is too long, truncate it
  if (cleaned.length > 30) {
    return cleaned.substring(0, 30) + "...";
  }
  
  return cleaned;
}

/**
 * Extract duration information from content
 * @param {string} content 
 * @returns {string}
 */
function extractDuration(content) {
  const patterns = [
    /(?:משך|duration|אורך|length):\s*([^\n]+)/i,
    /(\d+)\s+(?:ימים|days)/i,
    /טיול (?:בן|של) (\d+) (?:ימים|days)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return "Unknown duration";
}

/**
 * Extract tips from content
 * @param {string} content 
 * @returns {Array<string>}
 */
function extractTips(content) {
  const tips = [];
  
  // Extract tips section if it exists
  const tipsSection = content.match(/(?:טיפים|tips|המלצות|recommendations)(?:[^\n]*\n+)((?:(?:[\s\S](?!##))*?)(?=##|\n\n|$))/i);
  
  if (tipsSection && tipsSection[1]) {
    const tipLines = tipsSection[1].split('\n').filter(line => line.trim());
    for (const line of tipLines) {
      // Clean the tip line from bullet points and other formatting
      const cleanTip = line.replace(/^[*\-•💡]\s*(?:טיפ:|Tip:)?\s*/i, '').trim();
      if (cleanTip) {
        tips.push(cleanTip);
      }
    }
  } else {
    // Look for individual tips throughout the content
    const lines = content.split('\n');
    for (const line of lines) {
      if ((line.includes("טיפ") || line.includes("tip") || line.includes("💡")) && 
          !line.match(/^#/)) { // Avoid matching section headers
        const cleanTip = line.replace(/^[*\-•💡]\s*(?:טיפ:|Tip:)?\s*/i, '').trim();
        tips.push(cleanTip);
      }
    }
  }
  
  return tips;
}

/**
 * Extract budget information from content
 * @param {string} content 
 * @returns {Array<string>}
 */
function extractBudgetInfo(content) {
  const budgetNotes = [];
  
  // Try to find budget section
  const budgetSection = content.match(/(?:תקציב|budget)(?:[^\n]*\n+)((?:(?:[\s\S](?!##))*?)(?=##|\n\n|$))/i);
  
  if (budgetSection && budgetSection[1]) {
    const budgetLines = budgetSection[1].split('\n').filter(line => line.trim());
    for (const line of budgetLines) {
      const cleanLine = line.replace(/^[*\-•]\s*/, '').trim();
      if (cleanLine) {
        budgetNotes.push(cleanLine);
      }
    }
  } else {
    // Look for individual budget references
    const lines = content.split('\n');
    for (const line of lines) {
      if ((line.includes("תקציב") || line.includes("budget") || 
           line.includes("עלות") || line.includes("cost")) && 
          !line.match(/^#/)) {
        budgetNotes.push(line.trim());
      }
    }
  }
  
  return budgetNotes;
}

/**
 * Extract highlights from content
 * @param {string} content 
 * @returns {Array<string>}
 */
function extractHighlights(content) {
  const highlights = [];
  
  // Look for highlights section
  const highlightsSection = content.match(/(?:הדגשים|highlights|נקודות חשובות)(?:[^\n]*\n+)((?:(?:[\s\S](?!##))*?)(?=##|\n\n|$))/i);
  
  if (highlightsSection && highlightsSection[1]) {
    const highlightLines = highlightsSection[1].split('\n').filter(line => line.trim());
    for (const line of highlightLines) {
      const cleanLine = line.replace(/^[*\-•✨]\s*/, '').trim();
      if (cleanLine) {
        highlights.push(cleanLine);
      }
    }
  } else {
    // Try to find highlights in the first part of content
    const lines = content.split('\n').slice(0, 20);
    let inHighlightSection = false;
    
    for (const line of lines) {
      if (line.match(/(?:הדגשים|highlights|נקודות חשובות|must see|חובה לראות)/i)) {
        inHighlightSection = true;
        continue;
      }
      
      if (inHighlightSection && line.trim() && line.match(/^[*\-•✨]/)) {
        const cleanLine = line.replace(/^[*\-•✨]\s*/, '').trim();
        highlights.push(cleanLine);
      } else if (inHighlightSection && line.match(/^##/)) {
        // End of highlight section
        break;
      }
    }
  }
  
  return highlights;
}

/**
 * Extract summary from content
 * @param {string} content 
 * @returns {string}
 */
function extractSummary(content) {
  // Try to find a dedicated summary section
  const summarySection = content.match(/(?:תקציר|summary|סיכום|overview)(?:[^\n]*\n+)((?:(?:[\s\S](?!##))*?)(?=##|\n\n|$))/i);
  
  if (summarySection && summarySection[1]) {
    return summarySection[1].trim();
  }
  
  // If no dedicated section, use first few lines after destination/duration info
  const lines = content.split('\n');
  let foundIntro = false;
  let summary = [];
  
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip title and metadata lines
    if (line.match(/^#/) || line.includes(':') || line === '' || 
        line.includes('destination') || line.includes('יעד') ||
        line.includes('duration') || line.includes('משך')) {
      continue;
    }
    
    foundIntro = true;
    summary.push(line);
    
    // Stop if we find another section
    if (i > 5 && (line === '' || line.match(/^##/))) {
      break;
    }
  }
  
  if (foundIntro && summary.length > 0) {
    return summary.join('\n');
  }
  
  return "";
}

/**
 * Extract days and their activities from content
 * @param {string} content 
 * @returns {Array<object>}
 */
function extractDays(content) {
  const days = [];
  const lines = content.split('\n');
  
  let currentDay = null;
  let currentTimeBlock = null;
  let dayNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Match day headings
    const dayMatch = line.match(/^#{1,2}\s*(?:יום|day)\s+(\d+|[א-ת]'?)/i) || 
                    line.match(/^(?:יום|day)\s+(\d+|[א-ת]'?)/i);
                    
    if (dayMatch || (line.startsWith("יום:") || line.startsWith("Day:"))) {
      // Save previous day if it exists
      if (currentDay) {
        days.push(currentDay);
      }
      
      dayNumber++;
      
      // Extract day title
      let dayTitle = line;
      if (dayMatch && dayMatch[1]) {
        // Convert Hebrew day indicators to numbers if needed
        const hebrewDays = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10};
        const dayIndicator = dayMatch[1];
        
        if (Object.keys(hebrewDays).includes(dayIndicator.replace("'", ""))) {
          dayNumber = hebrewDays[dayIndicator.replace("'", "")];
        } else if (!isNaN(parseInt(dayIndicator))) {
          dayNumber = parseInt(dayIndicator);
        }
      }
      
      currentDay = {
        dayNumber: dayNumber,
        title: dayTitle.replace(/^#{1,2}\s*/, ''), // Remove markdown heading marks
        activities: {
          morning: [],
          lunch: [],
          afternoon: [],
          dinner: [],
          evening: []
        }
      };
      
      currentTimeBlock = null;
      continue;
    }
    
    // Skip if we haven't encountered a day yet
    if (!currentDay) continue;
    
    // Match time blocks
    if (line.match(/בוקר/i) || line.match(/morning/i)) {
      currentTimeBlock = "morning";
      continue;
    } else if (line.match(/צהריים/i) || line.match(/afternoon/i)) {
      currentTimeBlock = "afternoon";
      continue;
    } else if (line.match(/ערב/i) || line.match(/evening/i)) {
      currentTimeBlock = "evening";
      continue;
    } else if (line.match(/ארוחת צהריים/i) || line.match(/lunch/i)) {
      currentTimeBlock = "lunch";
      continue;
    } else if (line.match(/ארוחת ערב/i) || line.match(/dinner/i)) {
      currentTimeBlock = "dinner";
      continue;
    }
    
    // If we're in a time block and the line starts with a bullet point or similar,
    // it's an activity
    if (currentTimeBlock && (line.match(/^[*\-•]/) || line.match(/^\d+[\.\)]/) || line.match(/^[A-Za-z\u0590-\u05FF][\.\)]/))) {
      const activityText = line.replace(/^[*\-•\d]+[\.\)]\s*/, '');
      
      // Determine activity type based on content
      let activityType = "other";
      if (line.includes("אטרקציה") || line.includes("ביקור") || line.includes("סיור") || 
          line.includes("visit") || line.includes("tour") || line.includes("attraction") ||
          line.includes("מוזיאון") || line.includes("museum") || line.includes("גן") ||
          line.includes("park") || line.includes("אתר") || line.includes("site")) {
        activityType = "attraction";
      } else if (line.includes("מסעדה") || line.includes("ארוחה") || line.includes("restaurant") || 
                line.includes("meal") || line.includes("lunch") || line.includes("dinner") ||
                line.includes("food") || line.includes("אוכל")) {
        activityType = "restaurant";
      } else if (line.includes("מלון") || line.includes("לינה") || line.includes("hotel") || 
                line.includes("accommodation") || line.includes("stay") || line.includes("lodge") ||
                line.includes("hostel") || line.includes("אכסניה") || line.includes("צימר")) {
        activityType = "hotel";
      } else if (line.includes("נסיעה") || line.includes("הליכה") || line.includes("תחבורה") ||
                line.includes("travel") || line.includes("transport") || line.includes("drive") ||
                line.includes("walk") || line.includes("bus") || line.includes("train")) {
        activityType = "transportation";
      }
      
      const activity = {
        title: activityText,
        type: activityType
      };
      
      currentDay.activities[currentTimeBlock].push(activity);
    }
    // Accommodation information
    else if (line.includes("מלון") || line.includes("לינה") || line.includes("hotel") || 
            line.includes("accommodation") || line.includes("stay") || line.includes("lodge")) {
      
      if (!currentDay.accommodation) {
        currentDay.accommodation = {
          name: line.replace(/^[*\-•]\s*/, '')
        };
      }
    }
  }
  
  // Add the last day
  if (currentDay) {
    days.push(currentDay);
  }
  
  // If we couldn't extract days properly, try to create days from the content structure
  if (days.length === 0) {
    // Split content by large sections and create days
    const sections = content.split(/#{1,2}\s+/);
    
    // Skip the first section if it's an introduction
    const startIdx = sections[0].length < 200 ? 1 : 0;
    
    for (let i = startIdx; i < Math.min(sections.length, 10); i++) {
      const sectionContent = sections[i];
      
      if (sectionContent.trim()) {
        const dayNumber = i - startIdx + 1;
        
        // Create a simple day structure
        const day = {
          dayNumber: dayNumber,
          title: `יום ${dayNumber}`,
          activities: {
            morning: [],
            lunch: [],
            afternoon: [],
            dinner: [],
            evening: []
          }
        };
        
        // Extract activities from bullet points
        const activityMatches = sectionContent.match(/[*\-•]\s*([^\n]+)/g);
        if (activityMatches) {
          // Distribute activities across time blocks
          const activitiesPerBlock = Math.ceil(activityMatches.length / 3);
          
          activityMatches.forEach((match, idx) => {
            const activityText = match.replace(/^[*\-•]\s*/, '');
            const activity = {
              title: activityText,
              type: "other" // Simple default
            };
            
            // Simple distribution into morning, afternoon, evening
            if (idx < activitiesPerBlock) {
              day.activities.morning.push(activity);
            } else if (idx < activitiesPerBlock * 2) {
              day.activities.afternoon.push(activity);
            } else {
              day.activities.evening.push(activity);
            }
          });
        }
        
        days.push(day);
      }
    }
  }
  
  return days;
}

/**
 * Process raw content into a nicely formatted version
 * @param {string} rawContent 
 * @returns {string}
 */
function processRawContent(rawContent) {
  if (!rawContent) return null;
  
  // Parse the raw content into structured data
  const structuredData = parseRawContent(rawContent);
  
  // Generate nicely formatted content
  const lines = [];
  
  // Title section
  lines.push(`# יומן מסע - ${structuredData.destination}`);
  lines.push('');
  
  // Metadata section
  lines.push(`**יעד:** ${structuredData.destination}`);
  lines.push(`**משך:** ${structuredData.duration}`);
  lines.push('');
  
  // Summary
  if (structuredData.summary) {
    lines.push(structuredData.summary);
    lines.push('');
  }
  
  // Days
  structuredData.days.forEach(day => {
    lines.push(`## ${day.title || `יום ${day.dayNumber}`}`);
    lines.push('');
    
    // Morning
    if (day.activities.morning.length > 0) {
      lines.push('### בוקר');
      day.activities.morning.forEach(activity => {
        lines.push(`- ${activity.title}`);
      });
      lines.push('');
    }
    
    // Lunch
    if (day.activities.lunch.length > 0) {
      lines.push('### ארוחת צהריים');
      day.activities.lunch.forEach(activity => {
        lines.push(`- ${activity.title}`);
      });
      lines.push('');
    }
    
    // Afternoon
    if (day.activities.afternoon.length > 0) {
      lines.push('### אחר הצהריים');
      day.activities.afternoon.forEach(activity => {
        lines.push(`- ${activity.title}`);
      });
      lines.push('');
    }
    
    // Dinner
    if (day.activities.dinner.length > 0) {
      lines.push('### ארוחת ערב');
      day.activities.dinner.forEach(activity => {
        lines.push(`- ${activity.title}`);
      });
      lines.push('');
    }
    
    // Evening
    if (day.activities.evening.length > 0) {
      lines.push('### ערב');
      day.activities.evening.forEach(activity => {
        lines.push(`- ${activity.title}`);
      });
      lines.push('');
    }
    
    // Accommodation
    if (day.accommodation && day.accommodation.name) {
      lines.push('### לינה');
      lines.push(`- ${day.accommodation.name}`);
      lines.push('');
    }
  });
  
  // Tips
  if (structuredData.additionalInfo.tips.length > 0) {
    lines.push('## טיפים והמלצות');
    lines.push('');
    structuredData.additionalInfo.tips.forEach(tip => {
      lines.push(`💡 ${tip}`);
      lines.push('');
    });
  }
  
  // Budget notes
  if (structuredData.additionalInfo.budgetNotes.length > 0) {
    lines.push('## תקציב');
    lines.push('');
    structuredData.additionalInfo.budgetNotes.forEach(note => {
      lines.push(`- ${note}`);
    });
    lines.push('');
  }
  
  // Highlights
  if (structuredData.highlights.length > 0) {
    lines.push('## הדגשים');
    lines.push('');
    structuredData.highlights.forEach(highlight => {
      lines.push(`✨ ${highlight}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export {
  parseRawContent,
  processRawContent,
  extractDestination,
  extractDuration,
  extractDays,
  extractTips,
  extractHighlights,
  extractSummary,
  extractBudgetInfo,
  cleanDestinationName
}; 