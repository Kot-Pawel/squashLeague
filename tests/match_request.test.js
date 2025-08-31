/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

let firebaseMock, authMock, firestoreMock, collectionMock, whereMock, getMock, addMock, serverTimestampMock;
const scriptPath = path.resolve(__dirname, '../src/match_request.js');

beforeAll(() => {
    global.alert = jest.fn();
});

afterAll(() => {
    global.alert.mockRestore();
});

beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
        <button class="send-match-btn" 
            data-userid="user2" 
            data-date="2025-08-26" 
            data-slot="10:00-12:00">
            Send Match
        </button>
    `;

    // Mock Firestore chainable query
    getMock = jest.fn();
    addMock = jest.fn();
    whereMock = jest.fn(() => ({ where: whereMock, get: getMock }));
    collectionMock = jest.fn(() => ({
        where: whereMock,
        add: addMock,
    }));
    serverTimestampMock = jest.fn();

    // Mock firebase
    authMock = { currentUser: { uid: 'user1' } };
    firestoreMock = {
        collection: collectionMock,
    };
    firebaseMock = {
        auth: jest.fn(() => authMock),
        firestore: jest.fn(() => firestoreMock),
    };
    // Attach FieldValue to the firestore function
    firebaseMock.firestore.FieldValue = { serverTimestamp: serverTimestampMock };
    global.firebase = firebaseMock;

    // Load script
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    eval(scriptContent);
    document.dispatchEvent(new Event('DOMContentLoaded'));
});

afterEach(() => {
    delete global.firebase;
    jest.clearAllMocks();
});

describe('match_request.js', () => {
    it('shows login required if user not logged in', async () => {
        firebaseMock.auth.mockReturnValue({ currentUser: null });
        const btn = document.querySelector('.send-match-btn');
        btn.click();
        // Wait for async
        await Promise.resolve();
        expect(btn.innerHTML).toContain('Login required');
        expect(btn.disabled).toBe(true);
    });

    it('shows already requested if request exists', async () => {
        getMock.mockResolvedValue({ empty: false });
        const btn = document.querySelector('.send-match-btn');
        btn.click();
        await Promise.resolve();
        // Wait for async
        await Promise.resolve();
        expect(btn.innerHTML).toContain('Already Requested');
        expect(btn.disabled).toBe(true);
    });

    it('sends request and updates button on success', async () => {
        getMock.mockResolvedValue({ empty: true });
        addMock.mockResolvedValue({});
        const btn = document.querySelector('.send-match-btn');
        btn.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(addMock).toHaveBeenCalledWith(expect.objectContaining({
            fromUserId: 'user1',
            toUserId: 'user2',
            date: '2025-08-26',
            timeSlot: '10:00-12:00',
            status: 'pending'
        }));
        expect(btn.innerHTML).toContain('Request Sent');
        expect(btn.disabled).toBe(true);
    });

    it('shows error and calls alert on Firestore error', async () => {
        getMock.mockResolvedValue({ empty: true });
        addMock.mockRejectedValue(new Error('fail!'));
        const btn = document.querySelector('.send-match-btn');
        btn.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(btn.innerHTML).toContain('Error');
        expect(btn.disabled).toBe(false);
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('fail!'));
    });
});