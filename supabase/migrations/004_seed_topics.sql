-- Seed ~60 topics for SSC CGL and UPSC
-- Spec reference: §4 step 3

-- SSC CGL: Quantitative Aptitude (8 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('SSC CGL', 'Quantitative Aptitude', 'Number System', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Percentage', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Ratio and Proportion', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Time, Speed and Distance', 'hard'),
  ('SSC CGL', 'Quantitative Aptitude', 'Time and Work', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Profit and Loss', 'easy'),
  ('SSC CGL', 'Quantitative Aptitude', 'Simple and Compound Interest', 'intermediate'),
  ('SSC CGL', 'Quantitative Aptitude', 'Geometry and Mensuration', 'hard');

-- SSC CGL: Reasoning (8 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('SSC CGL', 'Reasoning', 'Syllogism', 'intermediate'),
  ('SSC CGL', 'Reasoning', 'Coding-Decoding', 'easy'),
  ('SSC CGL', 'Reasoning', 'Blood Relations', 'intermediate'),
  ('SSC CGL', 'Reasoning', 'Direction Sense', 'easy'),
  ('SSC CGL', 'Reasoning', 'Analogy', 'easy'),
  ('SSC CGL', 'Reasoning', 'Series', 'intermediate'),
  ('SSC CGL', 'Reasoning', 'Statement and Conclusion', 'hard'),
  ('SSC CGL', 'Reasoning', 'Seating Arrangement', 'hard');

-- SSC CGL: English (8 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('SSC CGL', 'English', 'Reading Comprehension', 'intermediate'),
  ('SSC CGL', 'English', 'Cloze Test', 'intermediate'),
  ('SSC CGL', 'English', 'Error Spotting', 'easy'),
  ('SSC CGL', 'English', 'Sentence Improvement', 'intermediate'),
  ('SSC CGL', 'English', 'Idioms and Phrases', 'easy'),
  ('SSC CGL', 'English', 'One Word Substitution', 'easy'),
  ('SSC CGL', 'English', 'Synonyms and Antonyms', 'easy'),
  ('SSC CGL', 'English', 'Para Jumbles', 'intermediate');

-- SSC CGL: General Awareness (8 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('SSC CGL', 'General Awareness', 'Indian History', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Indian Polity', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Geography', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Economics', 'hard'),
  ('SSC CGL', 'General Awareness', 'General Science', 'intermediate'),
  ('SSC CGL', 'General Awareness', 'Current Affairs', 'easy'),
  ('SSC CGL', 'General Awareness', 'Static GK', 'easy'),
  ('SSC CGL', 'General Awareness', 'Computer Awareness', 'easy');

-- UPSC: Polity (7 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('UPSC CSE', 'Polity', 'Indian Constitution', 'hard'),
  ('UPSC CSE', 'Polity', 'Fundamental Rights and Duties', 'intermediate'),
  ('UPSC CSE', 'Polity', 'Parliament and State Legislature', 'hard'),
  ('UPSC CSE', 'Polity', 'Judiciary', 'intermediate'),
  ('UPSC CSE', 'Polity', 'Panchayati Raj', 'intermediate'),
  ('UPSC CSE', 'Polity', 'Constitutional Bodies', 'hard'),
  ('UPSC CSE', 'Polity', 'Governance and Public Policy', 'hard');

-- UPSC: History (7 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('UPSC CSE', 'History', 'Ancient India', 'intermediate'),
  ('UPSC CSE', 'History', 'Medieval India', 'intermediate'),
  ('UPSC CSE', 'History', 'Modern India and Freedom Struggle', 'hard'),
  ('UPSC CSE', 'History', 'Art and Culture', 'intermediate'),
  ('UPSC CSE', 'History', 'World History', 'hard'),
  ('UPSC CSE', 'History', 'Post-Independence India', 'hard'),
  ('UPSC CSE', 'History', 'Social Reform Movements', 'intermediate');

-- UPSC: Geography (7 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('UPSC CSE', 'Geography', 'Physical Geography', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Indian Geography', 'intermediate'),
  ('UPSC CSE', 'Geography', 'World Geography', 'hard'),
  ('UPSC CSE', 'Geography', 'Climatology', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Oceanography', 'hard'),
  ('UPSC CSE', 'Geography', 'Human Geography', 'intermediate'),
  ('UPSC CSE', 'Geography', 'Environmental Geography', 'intermediate');

-- UPSC: Economy (7 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('UPSC CSE', 'Economy', 'Indian Economy Basics', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Banking and Finance', 'hard'),
  ('UPSC CSE', 'Economy', 'Fiscal Policy', 'hard'),
  ('UPSC CSE', 'Economy', 'Monetary Policy', 'hard'),
  ('UPSC CSE', 'Economy', 'International Trade', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Agriculture and Industry', 'intermediate'),
  ('UPSC CSE', 'Economy', 'Economic Reforms', 'hard');

-- UPSC: Environment (4 topics)
insert into topics (exam, subject, topic_name, difficulty) values
  ('UPSC CSE', 'Environment', 'Ecology and Biodiversity', 'intermediate'),
  ('UPSC CSE', 'Environment', 'Climate Change', 'hard'),
  ('UPSC CSE', 'Environment', 'Environmental Laws and Policies', 'intermediate'),
  ('UPSC CSE', 'Environment', 'Conservation Efforts', 'intermediate');
