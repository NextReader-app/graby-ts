// Mock for DOMPurify
const DOMPurify = {
  sanitize: jest.fn().mockImplementation((html, options) => {
    return html; // Simply return the input HTML
  })
};

export default DOMPurify;