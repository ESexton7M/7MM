/**
 * Configuration for section name standardization and grouping
 * Focused on the four primary project phases: Onboarding, Design/Mockup, Development, and Launch
 */

// Standard phase categories
export const standardPhaseCategories = [
    'Onboarding Phase',
    'Mockup Phase', 
    'Development Phase',
    'Launch'
];

// Comprehensive mapping of common section name variations to standard phases
export const phaseNameMappings: Record<string, string[]> = {
    'Onboarding': [
        // Exact matches
        'onboarding',
        'onboarding phase',
        'on-boarding',
        'project start',
        // Common variations
        'kickoff',
        'kick-off',
        'kick off',
        'orientation',
        'setup',
        'setup phase',
        'discovery',
        'discovery phase',
        'initiation',
        'project initiation',
        'briefing',
        'intake',
        'client intake',
        'requirement gathering',
        'requirements',
        'client onboarding',
        'welcome',
        'introduction',
        'intro',
        'getting started',
        'start',
        'strategy',
        'planning',
        'project planning',
        'scoping',
        'scope definition',
        'phase 1',
        'phase one',
        'contract',
        'agreement',
        // Additional mappings
        'initial setup',
        'preparation',
        'client onboarding'
    ],
    'Design': [
        // Exact matches
        'design',
        'design phase',
        'mockup',
        'mockup phase',
        'mock-up',
        'mock-up phase',
        // Common variations
        'ui',
        'ui design',
        'ux',
        'ux design',
        'wireframe',
        'wireframing',
        'prototype',
        'prototyping',
        'visual',
        'visual design',
        'concept',
        'concept design',
        'layout',
        'comps',
        'mock',
        'mocks',
        'creative',
        'creative design',
        'graphic design',
        'graphics',
        'sketch',
        'sketching',
        'draft',
        'drafting',
        'revision',
        'branding',
        'style guide',
        'phase 2',
        'phase two',
        'artboard',
        'artwork',
        'illustration',
        // Additional mappings
        'conceptualization',
        'blueprint',
        'drafting'
    ],
    'Development': [
        // Exact matches
        'development',
        'development phase',
        'dev',
        'dev phase',
        // Common variations
        'code',
        'coding',
        'programming',
        'implementation',
        'implementing',
        'build',
        'building',
        'construction',
        'engineering',
        'technical',
        'tech',
        'frontend',
        'front-end',
        'backend',
        'back-end',
        'feature',
        'functionality',
        'integration',
        'api',
        'api integration',
        'database',
        'site build',
        'website build',
        'app development',
        'application',
        'develop',
        'web dev',
        'software',
        'software dev',
        'sprints',
        'phase 3',
        'phase three',
        'content integration',
        'cms',
        'production',
        'testing',
        'qa',
        'test',
        'quality assurance',
        'validation',
        'verification',
        'bug fixing',
        'fixes',
        'debugging',
        // Additional mappings
        'implementation',
        'feature development',
        'module creation'
    ],
    'Launch': [
        // Exact matches
        'launch',
        'launch phase',
        // Common variations
        'go-live',
        'go live',
        'deploy',
        'deployment',
        'release',
        'publish',
        'publishing',
        'rollout',
        'production launch',
        'live',
        'shipping',
        'delivery',
        'handover',
        'handoff',
        'completion',
        'final',
        'finalization',
        'finishing',
        'complete',
        'final review',
        'final approval',
        'phase 4',
        'phase four',
        'client handoff',
        'client delivery',
        'client approval',
        'review',
        'approval',
        'final phase',
        'final stage',
        'maintenance',
        'support',
        'post-launch',
        'training',
        // Additional mappings
        'go-live',
        'final delivery',
        'handover'
    ]
};

/**
 * Maps a section name to a standard phase category
 * @param sectionName The original section name
 * @returns The standardized phase category
 */
export function standardizeSectionName(sectionName: string): string {
    if (!sectionName) return 'Other';
    
    const normalized = sectionName.trim().toLowerCase();
    
    // Check for exact matches first
    for (const [category, _] of Object.entries(phaseNameMappings)) {
        if (normalized === category.toLowerCase()) {
            return category;
        }
    }
    
    // Then check for substring matches
    for (const [category, variations] of Object.entries(phaseNameMappings)) {
        if (variations.some((variation: string) => 
            normalized.includes(variation) || 
            normalized.startsWith(variation) || 
            normalized.endsWith(variation)
        )) {
            return category;
        }
    }
    
    // Fallback to a phase based on numeric indicators (Phase 1, Phase 2, etc.)
    if (/phase\s*[1one]/i.test(normalized)) return 'Onboarding';
    if (/phase\s*[2two]/i.test(normalized)) return 'Design';
    if (/phase\s*[3three]/i.test(normalized)) return 'Development';
    if (/phase\s*[4four]/i.test(normalized)) return 'Launch';
    
    return 'Other'; // If no match found, categorize as Other
}

/**
 * Returns a color for a phase category
 * @param category The phase category
 * @param isInProgress Whether the section is currently in progress
 * @returns A hex color code
 */
export function getSectionCategoryColor(category: string, isInProgress?: boolean): string {
    // Normalize the category name for consistent matching
    const normalizedCategory = category.trim();
    
    const colorMap: Record<string, string> = {
        // Onboarding variations
        'Onboarding': '#3b82f6',         // Bright Blue
        'Onboarding Phase': '#3b82f6',   // Bright Blue
        'onboarding': '#3b82f6',         // Bright Blue
        'onboarding phase': '#3b82f6',   // Bright Blue
        
        // Design/Mockup variations  
        'Design': '#8b5cf6',             // Purple
        'Mockup Phase': '#8b5cf6',       // Purple
        'Mockup': '#8b5cf6',             // Purple
        'design': '#8b5cf6',             // Purple
        'mockup': '#8b5cf6',             // Purple
        'mockup phase': '#8b5cf6',       // Purple
        
        // Development variations
        'Development': '#10b981',        // Emerald Green
        'Development Phase': '#10b981',  // Emerald Green
        'development': '#10b981',        // Emerald Green
        'development phase': '#10b981',  // Emerald Green
        
        // Launch variations
        'Launch': '#f59e0b',             // Amber
        'launch': '#f59e0b',             // Amber
        
        // Other
        'Other': '#6b7280'               // Gray
    };
    
    if (isInProgress) {
        // Return a lighter, less saturated version of the color for in-progress sections
        const inProgressColorMap: Record<string, string> = {
            'Onboarding': '#60a5fa',         // Lighter Blue
            'Onboarding Phase': '#60a5fa',   // Lighter Blue
            'onboarding': '#60a5fa',         // Lighter Blue
            'onboarding phase': '#60a5fa',   // Lighter Blue
            
            'Design': '#a78bfa',             // Lighter Purple
            'Mockup Phase': '#a78bfa',       // Lighter Purple
            'Mockup': '#a78bfa',             // Lighter Purple
            'design': '#a78bfa',             // Lighter Purple
            'mockup': '#a78bfa',             // Lighter Purple
            'mockup phase': '#a78bfa',       // Lighter Purple
            
            'Development': '#34d399',        // Lighter Green
            'Development Phase': '#34d399',  // Lighter Green
            'development': '#34d399',        // Lighter Green
            'development phase': '#34d399',  // Lighter Green
            
            'Launch': '#fcd34d',             // Lighter Amber
            'launch': '#fcd34d',             // Lighter Amber
            
            'Other': '#9ca3af'               // Lighter Gray
        };
        const color = inProgressColorMap[normalizedCategory] || '#9ca3af';
        console.log(`DEBUG getSectionCategoryColor (in-progress): "${normalizedCategory}" -> ${color}`);
        return color;
    }
    
    const color = colorMap[normalizedCategory] || '#6b7280';
    console.log(`DEBUG getSectionCategoryColor: "${normalizedCategory}" -> ${color}`);
    return color;
}
