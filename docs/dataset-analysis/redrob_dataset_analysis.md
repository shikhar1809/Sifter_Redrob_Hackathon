# Redrob Dataset Structural Analysis

This report profiles the full challenge candidate file and translates the dataset patterns into ranking decisions for Sifter.

## Executive Findings

- The full file contains `100,000` candidates and is `464.69` MB uncompressed.
- Candidate IDs are clean: `100,000` unique IDs and `0` duplicate IDs.
- The dataset is deliberately adversarial: docs mention keyword stuffers, plain-language strong fits, behavioral twins, and about 80 honeypots.
- The JD is not asking for generic AI enthusiasm. It asks for production retrieval/ranking/search experience, evaluation maturity, Python, and a shipper mindset.
- Behavioral signals are intended as availability multipliers, not replacements for job-fit evidence.
- The strongest ranker should combine profile evidence, career text, skill evidence, and behavioral availability, while actively avoiding keyword-stuffing and impossible-profile traps.

## Dataset Shape

- Records: `100,000`
- File size: `464.69` MB
- Unique candidate IDs: `100,000`
- Duplicate candidate IDs: `0`
- Required-field missingness: `0` total missing required-field events in the streamed audit.

## Job Meaning Extracted From The Challenge Docs

The JD says the best candidate is not the person with the most AI keywords. The best candidate has evidence of:

- production embeddings/retrieval systems,
- vector or hybrid search infrastructure,
- ranking/evaluation frameworks such as NDCG, MRR, MAP, A/B testing,
- strong Python and production coding,
- product-company or product-building experience,
- practical shipping mindset,
- active/available platform behavior.

The docs explicitly warn that candidates with many AI keywords but weak career evidence are traps.

## Core Field Distributions

Experience years: min `1.0`, p25 `3.9`, median `6.8`, mean `7.1663`, p75 `9.9`, p95 `14.0`, max `16.9`.
Career roles per candidate: min `1`, p25 `2.0`, median `3.0`, mean `3.0017`, p75 `4.0`, p95 `6.0`, max `9`.
Skills per candidate: min `5`, p25 `7.0`, median `9.0`, mean `9.603`, p75 `11.0`, p95 `16.0`, max `23`.
Certifications per candidate: min `0`, p25 `0.0`, median `0.0`, mean `0.3748`, p75 `0.0`, p95 `2.0`, max `3`.
Languages per candidate: min `2`, p25 `2.0`, median `2.0`, mean `2`, p75 `2.0`, p95 `2.0`, max `2`.

Top countries:
- India: `75113`
- USA: `9978`
- Australia: `2579`
- Canada: `2506`
- UK: `2472`
- Germany: `2469`
- Singapore: `2453`
- UAE: `2430`

Top current titles:
- Business Analyst: `5833`
- HR Manager: `5830`
- Mechanical Engineer: `5791`
- Accountant: `5764`
- Project Manager: `5754`
- Customer Support: `5750`
- Operations Manager: `5744`
- Content Writer: `5727`
- Sales Executive: `5713`
- Civil Engineer: `5702`
- Graphic Designer: `5689`
- Marketing Manager: `5524`
- Software Engineer: `3450`
- Full Stack Developer: `2873`
- Cloud Engineer: `2836`
- Java Developer: `2809`
- .NET Developer: `2788`
- DevOps Engineer: `2787`
- Mobile Developer: `2757`
- Frontend Engineer: `2738`

Top industries:
- IT Services: `29881`
- Software: `22417`
- Manufacturing: `22305`
- Conglomerate: `7571`
- Paper Products: `7467`
- Fintech: `2808`
- Food Delivery: `2514`
- E-commerce: `1529`
- Consulting: `1274`
- EdTech: `610`
- SaaS: `328`
- AI/ML: `278`
- AdTech: `172`
- Transportation: `162`
- Insurance Tech: `155`

Company-size distribution:
- 10001+: `40464`
- 1001-5000: `18201`
- 201-500: `15096`
- 51-200: `7727`
- 11-50: `7568`
- 501-1000: `7525`
- 5001-10000: `3419`

## Skills And Role Evidence

Top skills across the full pool:
- HTML: `12246`
- Databricks: `12244`
- Redux: `12222`
- Terraform: `12187`
- Angular: `12173`
- Figma: `12157`
- Salesforce CRM: `12157`
- Vue.js: `12142`
- Sales: `12138`
- Accounting: `12136`
- Agile: `12135`
- Kafka: `12114`
- Excel: `12109`
- BigQuery: `12108`
- CI/CD: `12108`
- Project Management: `12106`
- Airflow: `12105`
- AWS: `12104`
- Flask: `12104`
- Scrum: `12083`
- Illustrator: `12072`
- Kubernetes: `12071`
- ETL: `12068`
- CSS: `12065`
- Docker: `12062`

Candidates with 4+ must-have retrieval/search/ranking skills: `5,616` (5.6%).
Candidates with career text showing 2+ IR/search/ranking hints: `505` (0.5%).
Candidates with career text showing 2+ production hints: `74,132` (74.1%).
Candidates in JD's strict 5-9 year band: `34,375` (34.4%).
Candidates matching the high-signal profile shape: `210` (0.2%).
Plain-language hidden-fit candidates found by career evidence despite lower skill keyword count: `0` (0.0%).

Ranking implication: skill count alone is dangerous. Sifter should reward career evidence and production/ranking text more than raw skill-list volume.

## Behavioral Signals

The Redrob docs say behavioral signals should modify skill fit because a perfect candidate who is unreachable is not practically hireable.

Profile completeness: min `25.0`, p25 `42.2`, median `56.8`, mean `56.7582`, p75 `71.6`, p95 `83.3`, max `99.9`.
Recruiter response rate: min `0.02`, p25 `0.25`, median `0.44`, mean `0.4366`, p75 `0.62`, p95 `0.76`, max `0.95`.
Average response time hours: min `2.1`, p25 `68.3`, median `129.9`, mean `132.7027`, p75 `193.3`, p95 `260.1`, max `280.0`.
Notice period days: min `0.0`, p25 `60.0`, median `90.0`, mean `87.3858`, p75 `120.0`, p95 `150.0`, max `150.0`.
GitHub activity score: min `-1.0`, p25 `-1.0`, median `-1.0`, mean `9.6192`, p75 `16.7`, p95 `48.4`, max `96.9`.
Interview completion rate: min `0.3`, p25 `0.48`, median `0.62`, mean `0.6195`, p75 `0.76`, p95 `0.88`, max `1.0`.
Offer acceptance rate: min `-1.0`, p25 `-1.0`, median `-1.0`, mean `-0.4036`, p75 `0.4`, p95 `0.7`, max `0.93`.

Open-to-work:
- False: `64661`
- True: `35339`

Preferred work mode:
- hybrid: `25076`
- onsite: `25000`
- flexible: `25000`
- remote: `24924`

Willing to relocate:
- False: `71196`
- True: `28804`

Ranking implication: response rate, last activity, notice period, and interview completion should be capped multipliers. They should help break ties and reduce unreachable candidates, but they should not overpower retrieval/ranking production evidence.

## Trap And Data-Quality Patterns

Expert skill with zero duration flags: `84`.
Many endorsements with tiny duration flags: `0`.
Keyword-stuffer shaped candidates: `1,706`.
Nontechnical-title candidates with high AI-skill volume: `3,077`.
CV/speech-heavy candidates without IR evidence: `252`.
Experience/career-history gap over 4 years: `42`.

These are not all guaranteed honeypots, but they are high-risk shapes. A strong ranker should down-weight them unless career history explains the mismatch.

## JD-Specific Risk Factors

Services-only career candidates: `8,991` (9.0%).
Candidates with at least one major services-company job: `60,221` (60.2%).

The JD explicitly says services-only careers are a concern, but candidates currently in services with prior product-company experience can still fit. That means the feature should be a penalty only when the whole career is services-only, not a blanket rejection.

## What Sifter Should Do Because Of This Analysis

| Dataset finding | Product/ranking decision |
| --- | --- |
| Skill lists contain deliberate keyword traps | Use career-history evidence and role-title fit before rewarding skill volume |
| Strong candidates may use plain language instead of exact RAG/Pinecone words | Map career text to concepts like search, recommendation, ranking, evaluation, and production ML |
| Behavioral signals are meaningful but can bias toward hyper-active users | Use them as capped availability multipliers, not core fit |
| Honeypots include impossible profile combinations | Add consistency checks for expert skills with zero duration, endorsement/duration mismatch, and career/experience mismatch |
| JD prioritizes production ranking/retrieval over generic AI | Weight retrieval, vector/hybrid search, evaluation, and production ownership above broad AI keywords |
| Services-only experience is explicitly risky, but not always disqualifying | Penalize only services-only career patterns; allow mixed product/services backgrounds |
| Stage 4 reviews reasoning manually | Keep reasons specific, evidence-backed, and honest about concerns |
| Top-10 drives 50% of scoring via NDCG@10 | Optimize precision at the very top, not broad recall across 100 candidates |

## Recommended Next Improvements

1. Add trap-aware penalties to the ranker using the suspicious patterns above.
2. Add a dataset-insight section to the README/deck so judges see that the ranker came from data understanding.
3. Build a small human-label audit set across obvious fits, hidden fits, keyword stuffers, and suspected honeypots.
4. Retrain the Hugging Face reranker with those labels and report human-label agreement.
5. Add a fairness/proxy audit over location, work mode, notice period, and platform activity so behavior does not become a hidden bias shortcut.

## Current Sifter Submission Alignment

This section checks the current `redrob_submission.csv` against the dataset patterns above.

- Submitted candidates found in dataset: `100`
- Trap-flag hits in submitted top 100: `0`
- Candidates in the JD 5-9 year band: `90`
- Average must-have retrieval/search skill count: `5.04`
- Average career IR/search/ranking evidence count: `6.36`
- Average career production evidence count: `5.02`

Top submitted titles:
- Recommendation Systems Engineer: `13`
- Applied ML Engineer: `13`
- Machine Learning Engineer: `12`
- Senior Data Scientist: `10`
- Search Engineer: `10`
- AI Engineer: `9`
- Senior NLP Engineer: `6`
- Senior Machine Learning Engineer: `5`
- NLP Engineer: `5`
- Senior AI Engineer: `4`
- Senior Applied Scientist: `4`
- Staff Machine Learning Engineer: `4`
- ML Engineer: `2`
- Lead AI Engineer: `2`
- Junior ML Engineer: `1`

Top submitted countries:
- India: `85`
- USA: `5`
- Germany: `3`
- Singapore: `2`
- Australia: `2`
- Canada: `1`
- UK: `1`
- UAE: `1`

Trap flags found in submitted top 100:
- None detected by the structural trap heuristics.

Interpretation: the current Sifter output is directionally aligned with the challenge docs. It avoids obvious keyword-stuffer shapes, mostly stays inside the intended seniority band, and ranks candidates with repeated retrieval/ranking/production evidence rather than generic AI keyword volume.

## Example Buckets

### services_only_career

- `CAND_0000003`: Customer Support in Austin, USA (1.1 yrs), skills=['Angular', 'SEO', 'Excel', 'Accounting', 'Kubernetes', 'Databricks'], response=0.46, notice=150d
- `CAND_0000008`: Operations Manager in Noida, Uttar Pradesh, India (3.6 yrs), skills=['Java', 'BigQuery', 'Spark', 'Accounting', 'Kubernetes', 'TypeScript', 'Rust', 'HTML'], response=0.42, notice=90d
- `CAND_0000024`: HR Manager in Trivandrum, Kerala, India (7.5 yrs), skills=['Figma', 'Kubernetes', 'Forecasting', 'ETL', 'Node.js', 'Docker'], response=0.78, notice=60d
- `CAND_0000027`: DevOps Engineer in Kolkata, West Bengal, India (3.9 yrs), skills=['Docker', 'YOLO', 'PEFT', 'Webpack', 'Data Science', 'AWS', 'Java', 'Angular', 'Databricks', 'ETL', 'Marketing', 'Information Retrieval'], response=0.58, notice=90d
- `CAND_0000028`: Operations Manager in Dubai, UAE (1.1 yrs), skills=['Snowflake', 'React', 'JavaScript', 'Tailwind', 'REST APIs', 'Photoshop', 'Data Pipelines', 'Terraform', 'CNN', 'Content Writing'], response=0.14, notice=60d

### high_signal_profile_shape

- `CAND_0000031`: Recommendation Systems Engineer in Hyderabad, Telangana, India (6.0 yrs), skills=['Go', 'MLflow', 'FAISS', 'Pinecone', 'Angular', 'Image Classification', 'Machine Learning', 'Speech Recognition', 'BentoML', 'MLOps', 'Embeddings', 'Information Retrieval'], response=0.91, notice=60d
- `CAND_0000422`: AI Research Engineer in Kolkata, West Bengal, India (6.3 yrs), skills=['MLflow', 'Python', 'Photoshop', 'Milvus', 'Java', 'OpenCV', 'Learning to Rank', 'OpenSearch', 'CNN', 'YOLO', 'Reinforcement Learning'], response=0.79, notice=90d
- `CAND_0001940`: AI Research Engineer in San Francisco, USA (4.3 yrs), skills=['PyTorch', 'Elasticsearch', 'Feature Engineering', 'Forecasting', 'Recommendation Systems', 'Tailwind', 'TensorFlow', 'Computer Vision', 'FAISS', 'Haystack', 'MLflow', 'Vector Search'], response=0.87, notice=90d
- `CAND_0002025`: Senior AI Engineer in Trivandrum, Kerala, India (5.9 yrs), skills=['Diffusion Models', 'FAISS', 'TensorFlow', 'scikit-learn', 'OpenSearch', 'Haystack', 'Weaviate', 'Sentence Transformers', 'QLoRA', 'NLP', 'Pinecone', 'Recommendation Systems'], response=0.8, notice=30d
- `CAND_0002120`: ML Engineer in Berlin, Germany (6.5 yrs), skills=['RAG', 'ETL', 'Hugging Face Transformers', 'Information Retrieval', 'Six Sigma', 'Pinecone', 'Reinforcement Learning', 'Data Science', 'Object Detection', 'Statistical Modeling', 'PostgreSQL', 'Embeddings'], response=0.72, notice=45d

### nontechnical_title_high_ai_skills

- `CAND_0000074`: Operations Manager in Indore, Madhya Pradesh, India (1.9 yrs), skills=['Go', 'gRPC', 'Next.js', 'Webpack', 'AWS', 'Information Retrieval', 'Hugging Face Transformers', 'Sentence Transformers', 'Recommendation Systems', 'Embeddings', 'RAG', 'LLMs'], response=0.73, notice=60d
- `CAND_0000083`: Graphic Designer in Berlin, Germany (6.7 yrs), skills=['BigQuery', 'Flask', 'Figma', 'SAP', 'Vue.js', 'Marketing', 'Semantic Search', 'Pinecone', 'Fine-tuning LLMs', 'RAG', 'Hugging Face Transformers', 'Recommendation Systems'], response=0.49, notice=90d
- `CAND_0000120`: Graphic Designer in Bhubaneswar, Odisha, India (5.7 yrs), skills=['FastAPI', 'AWS', 'Redux', 'Marketing', 'SQL', 'React', 'Salesforce CRM', 'Forecasting', 'Content Writing', 'RAG', 'Hugging Face Transformers', 'Vector Search'], response=0.58, notice=60d
- `CAND_0000121`: Customer Support in Mumbai, Maharashtra, India (3.7 yrs), skills=['Airflow', 'Marketing', 'Excel', 'SEO', 'Sales', 'FAISS', 'Vector Search', 'Recommendation Systems', 'RAG', 'Fine-tuning LLMs', 'Hugging Face Transformers', 'Prompt Engineering'], response=0.54, notice=30d
- `CAND_0000201`: Marketing Manager in Mumbai, Maharashtra, India (14.1 yrs), skills=['Sales', 'Data Pipelines', 'Vue.js', 'GraphQL', 'Marketing', 'Apache Flink', 'Information Retrieval', 'Embeddings', 'Fine-tuning LLMs', 'Hugging Face Transformers', 'LangChain', 'RAG'], response=0.72, notice=60d

### keyword_stuffer_shape

- `CAND_0000083`: Graphic Designer in Berlin, Germany (6.7 yrs), skills=['BigQuery', 'Flask', 'Figma', 'SAP', 'Vue.js', 'Marketing', 'Semantic Search', 'Pinecone', 'Fine-tuning LLMs', 'RAG', 'Hugging Face Transformers', 'Recommendation Systems'], response=0.49, notice=90d
- `CAND_0000120`: Graphic Designer in Bhubaneswar, Odisha, India (5.7 yrs), skills=['FastAPI', 'AWS', 'Redux', 'Marketing', 'SQL', 'React', 'Salesforce CRM', 'Forecasting', 'Content Writing', 'RAG', 'Hugging Face Transformers', 'Vector Search'], response=0.58, notice=60d
- `CAND_0000212`: Customer Support in Austin, USA (13.0 yrs), skills=['Airflow', 'Scrum', 'Content Writing', 'HTML', 'Vue.js', 'Redux', 'Next.js', 'Kubernetes', 'Marketing', 'Go', 'Fine-tuning LLMs', 'Hugging Face Transformers'], response=0.06, notice=30d
- `CAND_0000312`: Content Writer in Delhi, Delhi, India (11.5 yrs), skills=['HTML', 'Kubernetes', 'GCP', 'Rust', 'Microservices', 'Databricks', 'Airflow', 'YOLO', 'Redux', 'FAISS', 'Embeddings', 'Prompt Engineering'], response=0.62, notice=120d
- `CAND_0000330`: Civil Engineer in Kolkata, West Bengal, India (12.0 yrs), skills=['JavaScript', 'GraphQL', 'Six Sigma', 'Microservices', 'FastAPI', 'Excel', 'SAP', 'Databricks', 'Rust', 'Photoshop', 'MLOps', 'RAG'], response=0.6, notice=60d

### cv_speech_without_ir

- `CAND_0000112`: AI Specialist in Vizag, Andhra Pradesh, India (3.8 yrs), skills=['Deep Learning', 'TensorFlow', 'Time Series', 'Speech Recognition', 'GANs', 'ASR', 'LlamaIndex', 'Object Detection', 'Haystack', 'Go', 'Hugging Face Transformers', 'Redux'], response=0.31, notice=45d
- `CAND_0000584`: Analytics Engineer in Indore, Madhya Pradesh, India (7.3 yrs), skills=['BM25', 'Semantic Search', 'ASR', 'CI/CD', 'JavaScript', 'Node.js', 'YOLO', 'OpenCV', 'GCP', 'TTS', 'Tally', 'MLflow'], response=0.8, notice=90d
- `CAND_0000790`: Data Analyst in Pune, Maharashtra, India (7.9 yrs), skills=['Image Classification', 'TensorFlow', 'Redux', 'Go', 'Python', 'HTML', 'LangChain', 'Speech Recognition', 'JavaScript', 'MLOps', 'GANs', 'Reinforcement Learning'], response=0.33, notice=120d
- `CAND_0001378`: Software Engineer in Vizag, Andhra Pradesh, India (4.8 yrs), skills=['ASR', 'Image Classification', 'Speech Recognition', 'CNN', 'YOLO', 'Terraform', 'OpenCV', 'Haystack', 'SQL', 'Computer Vision', 'Photoshop'], response=0.77, notice=60d
- `CAND_0001547`: Software Engineer in San Francisco, USA (5.7 yrs), skills=['Project Management', 'LLMs', 'Computer Vision', 'Feature Engineering', 'Figma', 'Object Detection', 'SQL', 'YOLO', 'LoRA', 'dbt', 'Information Retrieval', 'Image Classification'], response=0.64, notice=90d

### experience_history_gap_over_4y

- `CAND_0003430`: Business Analyst in Pune, Maharashtra, India (13.7 yrs), skills=['Go', 'TTS', 'Kubernetes', 'Content Writing', 'Snowflake', 'JavaScript'], response=0.48, notice=60d
- `CAND_0005291`: Business Analyst in Indore, Madhya Pradesh, India (12.8 yrs), skills=['ETL', 'Kafka', 'Rust', 'React', 'Next.js', 'Sales', 'Content Writing'], response=0.14, notice=60d
- `CAND_0007353`: Frontend Engineer in Noida, Uttar Pradesh, India (9.9 yrs), skills=['Tailwind', 'Apache Flink', 'Content Writing', 'Hadoop', 'RAG', 'Reinforcement Learning', 'Microservices'], response=0.65, notice=120d
- `CAND_0007413`: Business Analyst in Coimbatore, Tamil Nadu, India (13.3 yrs), skills=['Weights & Biases', 'ETL', 'Java', 'Rust', 'Terraform', 'dbt'], response=0.25, notice=60d
- `CAND_0008960`: Graphic Designer in Mumbai, Maharashtra, India (10.3 yrs), skills=['Project Management', 'HTML', 'Data Pipelines', 'CSS', 'Image Classification', 'Marketing', 'SQL', 'Databricks'], response=0.47, notice=90d

### expert_skill_with_zero_duration

- `CAND_0003582`: Mobile Developer in Kolkata, West Bengal, India (8.2 yrs), skills=['Docker', 'Image Classification', 'MLflow', 'Photoshop', 'TTS', 'Spring Boot', 'JavaScript', 'Content Writing'], response=0.29, notice=120d
- `CAND_0016000`: Full Stack Developer in Sydney, Australia (2.0 yrs), skills=['Flask', 'Spring Boot', 'TypeScript', 'Go', 'REST APIs', 'Docker', 'Terraform', 'Hadoop', 'AWS', 'Photoshop'], response=0.55, notice=90d
- `CAND_0033817`: HR Manager in Berlin, Germany (13.3 yrs), skills=['FastAPI', 'JavaScript', 'Diffusion Models', 'BigQuery', 'PostgreSQL', 'Illustrator', 'Six Sigma', 'gRPC'], response=0.34, notice=150d
- `CAND_0033972`: QA Engineer in Coimbatore, Tamil Nadu, India (6.0 yrs), skills=['MLOps', 'Airflow', 'OpenCV', 'Figma', 'PostgreSQL', 'Tally', 'Excel'], response=0.25, notice=90d
- `CAND_0036839`: Operations Manager in Ahmedabad, Gujarat, India (8.1 yrs), skills=['SAP', 'GCP', 'Django', 'Go', 'TTS', 'Rust'], response=0.38, notice=60d
