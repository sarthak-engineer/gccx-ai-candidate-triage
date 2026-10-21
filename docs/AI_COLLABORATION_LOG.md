# AI Collaboration Log

## Tools used
- **ChatGPT (GPT-6)**: Used for architecture discussions, implementation guidance, debugging, test design, complexity analysis, and documentation planning.
- **Groq API with `openai/gpt-oss-120b`**: Used by the application to generate candidate fit summaries from candidate skills and notes.
- **Local development tools**: Python, FastAPI, SQLite, pytest, React, Vite, and Node.js were used to implement and verify the application.

## Prompts used during development
The following are representative prompts from the development process. The final submission should preserve the exact wording of the actual prompts used; replace these examples if they do not match the original conversation.
1. “I have a Groq API key available. Guide me through configuring it securely for the GCCX project.”
2. “Review backend/app/ranking.py and tests/test_ranking.py for the GCCX AI Full-Stack Engineer Intern case study.”
3. “Do not modify unrelated files or add unnecessary dependencies. First report any correctness bugs, edge cases, or complexity issues.”

## Correction and verification
During LLM integration, the initially attempted Groq model identifier returned a 404 error. Instead of treating the error as an application bug or assuming any model name would work, I checked the models available to my account and switched to `openai/gpt-oss-120b`. I verified the corrected integration with a real API request and observed a successful summary response.

I also tested evidence validation and cache reuse with automated tests. These checks are important because a well-written AI response is not sufficient if its supporting evidence is fabricated or repeated requests unnecessarily call the model.

## Where AI helped
AI assistance accelerated implementation planning, API integration troubleshooting, and test-case design. I retained changes only after checking the code, running the application or tests, or verifying the relevant API behavior. The test suite reached 12 passing tests before the separate ranking tests were added.

## Human responsibility
I remain responsible for the architecture, scope, code review, test results, security of credentials, and final submission. AI-generated fit summaries are advisory and evidence-based; recruiters retain responsibility for hiring decisions.
