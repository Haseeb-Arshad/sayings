const { getGrokResponse } = require('./groktest');

const runGrokTest = async () => {
  const messages = [
    { role: 'system', content: 'You are a test assistant.' },
    { role: 'user', content: 'What in the world are you? show me your humor and tell me a joke about humanity.' },
  ];

  try {
    const response = await getGrokResponse(messages);
    console.log('Grok Response:', response);
    console.log('Grok Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

runGrokTest();
