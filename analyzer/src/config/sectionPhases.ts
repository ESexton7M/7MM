/**
 * Configuration for section name standardization and grouping
 * Focused on the four primary project phases: Onboarding, Design/Mockup, Development, and Launch
 */

// Standard phase categories
export const standardPhaseCategories = [
    'Onboarding',
    'Design',
    'Development',
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
        'agreement'
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
        'illustration'
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
        'debugging'
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
        'training'
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
    const colorMap: Record<string, string> = {
        'Onboarding': '#3b82f6',  // Blue
        'Design': '#8b5cf6',      // Purple
        'Development': '#10b981', // Green
        'Launch': '#f59e0b',      // Amber
        'Other': '#6b7280'        // Gray
    };
    
    if (isInProgress) {
        // Return a lighter, less saturated version of the color for in-progress sections
        const inProgressColorMap: Record<string, string> = {
            'Onboarding': '#60a5fa',  // Lighter Blue
            'Design': '#a78bfa',      // Lighter Purple
            'Development': '#34d399', // Lighter Green
            'Launch': '#fcd34d',      // Lighter Amber
            'Other': '#9ca3af'        // Lighter Gray
        };
        return inProgressColorMap[category] || '#9ca3af';
    }
    
    return colorMap[category] || '#6b7280'; // Default gray
}
