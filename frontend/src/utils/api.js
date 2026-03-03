const BASE_URL =
    typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.location.port !== '5000'
        ? 'http://localhost:5000'
        : '';

export default BASE_URL;
