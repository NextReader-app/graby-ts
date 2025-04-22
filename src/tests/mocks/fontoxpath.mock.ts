// Mock for fontoxpath
export const evaluateXPathToNodes = jest.fn().mockImplementation(() => {
  return [{ 
    textContent: 'Test Content',
    nodeType: 1,
    hasAttribute: () => true, 
    getAttribute: () => 'test',
    cloneNode: () => ({ textContent: 'Test Content Clone' }),
    parentNode: {
      removeChild: jest.fn()
    }
  }];
});