-- Manual test setup for Task 1.4: Basic Retrieval
-- This script creates test notes, chunks, and embeddings

-- Test user ID
-- Using: 145a8c2b-d7af-482d-91e8-8d754538d505

-- Note 1: Calculus Fundamentals
INSERT INTO notes (id, user_id, title, content, word_count)
VALUES (
  'calc-note-001',
  '145a8c2b-d7af-482d-91e8-8d754538d505',
  'Calculus Fundamentals',
  '# Calculus Fundamentals

## Derivatives

A derivative measures how a function changes as its input changes. The derivative of a function f(x) at a point x is the slope of the tangent line at that point.

The power rule states that if f(x) = x^n, then f''(x) = nx^(n-1).

## Integrals

An integral is the inverse operation to differentiation. While derivatives measure rates of change, integrals measure accumulated quantities.',
  100
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- Note 2: Italian Cooking
INSERT INTO notes (id, user_id, title, content, word_count)
VALUES (
  'cook-note-001',
  '145a8c2b-d7af-482d-91e8-8d754538d505',
  'Italian Cooking Basics',
  '# Italian Cooking Basics

## Pasta Making

The key to perfect pasta is using the right ratio of flour to eggs. A classic recipe uses 100g of flour per egg.

## Classic Sauces

### Marinara Sauce

A simple marinara sauce requires only tomatoes, garlic, olive oil, and fresh basil. Simmer for 30 minutes.

### Carbonara Recipe

Traditional carbonara uses eggs, pecorino cheese, guanciale, and black pepper. Never add cream!',
  100
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- Note 3: World War II
INSERT INTO notes (id, user_id, title, content, word_count)
VALUES (
  'hist-note-001',
  '145a8c2b-d7af-482d-91e8-8d754538d505',
  'World War II Overview',
  '# World War II Overview

## Causes of WWII

World War II was caused by multiple factors including the Treaty of Versailles, economic depression, and the rise of totalitarian regimes.

## Major Battles

The Battle of Stalingrad was a turning point in the European theater. The Soviet victory marked the beginning of Germany''s retreat.',
  100
) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- Check if notes were created
SELECT id, title FROM notes WHERE user_id = '145a8c2b-d7af-482d-91e8-8d754538d505';
