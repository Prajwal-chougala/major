import re

with open(r'C:\Users\Asus\.gemini\antigravity-ide\brain\f813f63f-f2a8-45a4-b9a7-e28c797e03e5\.system_generated\steps\334\content.md', 'r', encoding='utf-8') as f:
    content = f.read()

body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL)
if body_match:
    body_html = body_match.group(1)
    
    body_html = body_html.replace('class=', 'className=')
    body_html = body_html.replace('for=', 'htmlFor=')
    body_html = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', body_html)
    
    body_html = re.sub(r'<(img|input|br|hr)([^>]*?)(?<!/)>', r'<\1\2 />', body_html)

    body_html = body_html.replace('viewbox=', 'viewBox=')
    body_html = body_html.replace('stroke-width=', 'strokeWidth=')
    body_html = body_html.replace('stroke-dasharray=', 'strokeDasharray=')
    body_html = body_html.replace('stroke-dashoffset=', 'strokeDashoffset=')
    
    react_code = f"""import React from 'react';
import {{ Link }} from 'react-router-dom';

function LandingPage() {{
    return (
        <div className="bg-background font-body-md text-on-background">
            {body_html}
        </div>
    );
}}

export default LandingPage;
"""
    
    with open(r'd:\wattwise-project\frontend\src\pages\LandingPage.js', 'w', encoding='utf-8') as out:
        out.write(react_code)
    print('Successfully reset LandingPage.js')
