#!/usr/bin/env python3
"""
Skill Requirements Analyzer

Analyzes usage examples and requirements to suggest optimal skill architecture,
including which scripts, references, and assets to create.
"""

import argparse
import json
import sys
from pathlib import Path


class RequirementsAnalyzer:
    """Analyze skill requirements and suggest architecture"""
    
    def __init__(self):
        self.requirements = {
            'examples': [],
            'capabilities': [],
            'triggers': [],
            'constraints': []
        }
        self.architecture = {
            'scripts': [],
            'references': [],
            'assets': [],
            'skill_type': 'generic',
            'freedom_level': 'medium',
            'workflow_complexity': 'simple'
        }
    
    def analyze_examples(self, examples):
        """Analyze usage examples to extract patterns"""
        self.requirements['examples'] = examples
        
        # Pattern detection
        patterns = {
            'api_calls': any('api' in ex.lower() or 'endpoint' in ex.lower() for ex in examples),
            'file_processing': any('file' in ex.lower() or 'document' in ex.lower() for ex in examples),
            'data_analysis': any('analyze' in ex.lower() or 'calculate' in ex.lower() for ex in examples),
            'multi_step': any('then' in ex.lower() or 'after' in ex.lower() or 'step' in ex.lower() for ex in examples),
            'template_based': any('format' in ex.lower() or 'template' in ex.lower() for ex in examples)
        }
        
        # Determine skill type
        if patterns['api_calls']:
            self.architecture['skill_type'] = 'api'
        elif patterns['file_processing']:
            self.architecture['skill_type'] = 'document'
        elif patterns['data_analysis']:
            self.architecture['skill_type'] = 'analysis'
        elif patterns['multi_step']:
            self.architecture['skill_type'] = 'workflow'
        
        # Determine workflow complexity
        step_indicators = sum(1 for ex in examples if any(word in ex.lower() for word in ['then', 'after', 'step', 'next', 'finally']))
        if step_indicators > len(examples) * 0.6:
            self.architecture['workflow_complexity'] = 'complex'
        elif step_indicators > len(examples) * 0.3:
            self.architecture['workflow_complexity'] = 'medium'
        
        return patterns
    
    def suggest_scripts(self, patterns):
        """Suggest scripts based on patterns"""
        scripts = []
        
        if patterns.get('api_calls'):
            scripts.extend([
                {
                    'name': 'auth.py',
                    'purpose': 'Handle API authentication',
                    'priority': 'high'
                },
                {
                    'name': 'api_client.py',
                    'purpose': 'Make API requests with error handling',
                    'priority': 'high'
                }
            ])
        
        if patterns.get('file_processing'):
            scripts.extend([
                {
                    'name': 'load.py',
                    'purpose': 'Load and validate input files',
                    'priority': 'high'
                },
                {
                    'name': 'process.py',
                    'purpose': 'Process file content',
                    'priority': 'high'
                }
            ])
        
        if patterns.get('data_analysis'):
            scripts.extend([
                {
                    'name': 'analyze.py',
                    'purpose': 'Perform data analysis',
                    'priority': 'medium'
                },
                {
                    'name': 'visualize.py',
                    'purpose': 'Generate visualizations',
                    'priority': 'low'
                }
            ])
        
        if patterns.get('multi_step') and self.architecture['workflow_complexity'] == 'complex':
            scripts.append({
                'name': 'validate.py',
                'purpose': 'Validate outputs at each step',
                'priority': 'high'
            })
        
        self.architecture['scripts'] = scripts
        return scripts
    
    def suggest_references(self, patterns):
        """Suggest reference files based on patterns"""
        references = []
        
        if patterns.get('api_calls'):
            references.extend([
                {
                    'name': 'endpoints.md',
                    'purpose': 'Document all API endpoints and parameters',
                    'priority': 'high'
                },
                {
                    'name': 'schemas.md',
                    'purpose': 'Define request/response schemas',
                    'priority': 'high'
                },
                {
                    'name': 'examples.md',
                    'purpose': 'Provide usage examples',
                    'priority': 'medium'
                }
            ])
        
        if patterns.get('file_processing'):
            references.extend([
                {
                    'name': 'formats.md',
                    'purpose': 'Document supported file formats',
                    'priority': 'high'
                },
                {
                    'name': 'extraction-patterns.md',
                    'purpose': 'Define data extraction rules',
                    'priority': 'medium'
                }
            ])
        
        if patterns.get('data_analysis'):
            references.extend([
                {
                    'name': 'methods.md',
                    'purpose': 'Document analysis methodologies',
                    'priority': 'high'
                },
                {
                    'name': 'interpretation.md',
                    'purpose': 'Guide for interpreting results',
                    'priority': 'medium'
                }
            ])
        
        if patterns.get('template_based'):
            references.append({
                'name': 'style-guide.md',
                'purpose': 'Define output format and style',
                'priority': 'high'
            })
        
        # Always include examples
        if not any(ref['name'] == 'examples.md' for ref in references):
            references.append({
                'name': 'examples.md',
                'purpose': 'Provide comprehensive usage examples',
                'priority': 'high'
            })
        
        self.architecture['references'] = references
        return references
    
    def suggest_assets(self, patterns):
        """Suggest asset files based on patterns"""
        assets = []
        
        if patterns.get('template_based'):
            assets.extend([
                {
                    'name': 'template.md',
                    'purpose': 'Output template for content generation',
                    'priority': 'high'
                },
                {
                    'name': 'style.css',
                    'purpose': 'Styling for formatted output',
                    'priority': 'low'
                }
            ])
        
        if patterns.get('file_processing'):
            assets.append({
                'name': 'output-template.json',
                'purpose': 'Template for structured output',
                'priority': 'medium'
            })
        
        self.architecture['assets'] = assets
        return assets
    
    def determine_freedom_level(self, patterns):
        """Determine appropriate freedom level"""
        
        # High freedom for creative/analytical tasks
        if patterns.get('data_analysis') and not patterns.get('template_based'):
            self.architecture['freedom_level'] = 'high'
        
        # Low freedom for fragile operations
        elif patterns.get('api_calls') and patterns.get('multi_step'):
            self.architecture['freedom_level'] = 'low'
        
        # Medium freedom as default
        else:
            self.architecture['freedom_level'] = 'medium'
        
        return self.architecture['freedom_level']
    
    def generate_description(self, skill_name, capabilities, triggers):
        """Generate comprehensive skill description"""
        
        cap_text = ", ".join(capabilities) if capabilities else "[key capabilities]"
        trig_text = ", ".join(f'"{t}"' for t in triggers) if triggers else "[key triggers]"
        
        description = (
            f"{skill_name.replace('-', ' ').title()} for {cap_text}. "
            f"Use when user requests {trig_text}. "
            f"Handles {self.architecture['skill_type']} workflows with "
            f"{self.architecture['workflow_complexity']} complexity."
        )
        
        return description
    
    def generate_report(self, skill_name):
        """Generate comprehensive architecture report"""
        
        report = {
            'skill_name': skill_name,
            'architecture': self.architecture,
            'recommendations': self._generate_recommendations(),
            'implementation_order': self._generate_implementation_order(),
            'estimated_time': self._estimate_time()
        }
        
        return report
    
    def _generate_recommendations(self):
        """Generate implementation recommendations"""
        recs = []
        
        # Script recommendations
        high_priority_scripts = [s for s in self.architecture['scripts'] if s['priority'] == 'high']
        if high_priority_scripts:
            recs.append(f"Create {len(high_priority_scripts)} high-priority scripts first")
        
        # Reference recommendations
        if len(self.architecture['references']) > 3:
            recs.append("Consider splitting references into core and advanced files")
        
        # SKILL.md recommendations
        if self.architecture['workflow_complexity'] == 'complex':
            recs.append("Use sequential workflow pattern in SKILL.md")
        
        # Freedom level recommendations
        if self.architecture['freedom_level'] == 'low':
            recs.append("Provide specific scripts for all operations")
        elif self.architecture['freedom_level'] == 'high':
            recs.append("Use text-based instructions with decision guidance")
        
        return recs
    
    def _generate_implementation_order(self):
        """Suggest order of implementation"""
        order = [
            "1. Create skill structure (directories)",
            "2. Generate high-priority scripts",
            "3. Create core reference files",
            "4. Add asset templates (if needed)",
            "5. Write SKILL.md with workflow",
            "6. Test scripts thoroughly",
            "7. Add medium-priority resources",
            "8. Validate and package"
        ]
        return order
    
    def _estimate_time(self):
        """Estimate implementation time"""
        base_time = 10  # minutes
        
        # Add time for scripts
        base_time += len(self.architecture['scripts']) * 15
        
        # Add time for references
        base_time += len(self.architecture['references']) * 10
        
        # Add time for complexity
        complexity_multipliers = {
            'simple': 1.0,
            'medium': 1.3,
            'complex': 1.6
        }
        base_time *= complexity_multipliers[self.architecture['workflow_complexity']]
        
        return f"{base_time}-{int(base_time * 1.5)} minutes"
    
    def print_analysis(self, skill_name):
        """Print formatted analysis"""
        report = self.generate_report(skill_name)
        
        print(f"\n{'='*60}")
        print(f"SKILL ARCHITECTURE ANALYSIS: {skill_name}")
        print(f"{'='*60}\n")
        
        print(f"Skill Type: {self.architecture['skill_type']}")
        print(f"Workflow Complexity: {self.architecture['workflow_complexity']}")
        print(f"Freedom Level: {self.architecture['freedom_level']}")
        print(f"Estimated Time: {report['estimated_time']}\n")
        
        print("RECOMMENDED SCRIPTS:")
        for script in self.architecture['scripts']:
            priority_marker = "⚡" if script['priority'] == 'high' else "○"
            print(f"  {priority_marker} {script['name']}: {script['purpose']}")
        
        print("\nRECOMMENDED REFERENCES:")
        for ref in self.architecture['references']:
            priority_marker = "⚡" if ref['priority'] == 'high' else "○"
            print(f"  {priority_marker} {ref['name']}: {ref['purpose']}")
        
        if self.architecture['assets']:
            print("\nRECOMMENDED ASSETS:")
            for asset in self.architecture['assets']:
                priority_marker = "⚡" if asset['priority'] == 'high' else "○"
                print(f"  {priority_marker} {asset['name']}: {asset['purpose']}")
        
        print("\nRECOMMENDATIONS:")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"  {i}. {rec}")
        
        print("\nIMPLEMENTATION ORDER:")
        for step in report['implementation_order']:
            print(f"  {step}")
        
        print(f"\n{'='*60}\n")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Analyze skill requirements and suggest architecture"
    )
    parser.add_argument(
        "skill_name",
        help="Name of the skill to analyze"
    )
    parser.add_argument(
        "-e", "--examples",
        nargs="+",
        required=True,
        help='Usage examples (e.g., "Fetch user data from API" "Process uploaded document")'
    )
    parser.add_argument(
        "-o", "--output",
        help="Save analysis to JSON file"
    )
    
    args = parser.parse_args()
    
    # Create analyzer
    analyzer = RequirementsAnalyzer()
    
    # Analyze examples
    patterns = analyzer.analyze_examples(args.examples)
    
    # Generate suggestions
    analyzer.suggest_scripts(patterns)
    analyzer.suggest_references(patterns)
    analyzer.suggest_assets(patterns)
    analyzer.determine_freedom_level(patterns)
    
    # Print analysis
    analyzer.print_analysis(args.skill_name)
    
    # Save to file if requested
    if args.output:
        report = analyzer.generate_report(args.skill_name)
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"Analysis saved to: {args.output}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
