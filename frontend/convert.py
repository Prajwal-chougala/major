import re

with open(r'd:\wattwise-project\frontend\src\pages\LandingPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<a([^>]*)href="#"(.*?)>(.*?)</a>',
    lambda m: f'<Link{m.group(1)}to="/auth"{m.group(2)}>{m.group(3)}</Link>' if 'Get Started' in m.group(3) or 'Login' in m.group(3) or 'person' in m.group(3) else f'<Link{m.group(1)}to="/"{m.group(2)}>{m.group(3)}</Link>',
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'<button([^>]*)>(.*?)Get Started(.*?)</button>',
    r'<Link to="/auth"\1>\2Get Started\3</Link>',
    content,
    flags=re.DOTALL
)

with open(r'd:\wattwise-project\frontend\src\pages\LandingPage.js', 'w', encoding='utf-8') as out:
    out.write(content)
print('Updated LandingPage links')
