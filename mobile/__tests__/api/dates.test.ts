import apiClient from '../../src/api/client';
import {
  createDateRequest,
  getMyDateRequests,
  cancelDateRequest,
  getMyGroups,
  getMyMatches,
} from '../../src/api/dates';

jest.mock('../../src/api/client');

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

describe('dates API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('createDateRequest calls POST /api/date-requests', async () => {
    const requestData = {
      group_size: 4,
      activity: 'bowling' as const,
      availability_slots: [{ date: '2026-04-01', time_window: 'evening' as const }],
    };
    const mockResponse = { data: { id: '456', ...requestData, status: 'pending' } };
    mockedClient.post.mockResolvedValueOnce(mockResponse);

    const result = await createDateRequest(requestData);

    expect(mockedClient.post).toHaveBeenCalledWith('/api/date-requests', requestData);
    expect(result).toEqual(mockResponse.data);
  });

  it('getMyDateRequests calls GET /api/date-requests', async () => {
    const mockData = [{ id: '456', status: 'pending' }];
    mockedClient.get.mockResolvedValueOnce({ data: mockData });

    const result = await getMyDateRequests();

    expect(mockedClient.get).toHaveBeenCalledWith('/api/date-requests');
    expect(result).toEqual(mockData);
  });

  it('cancelDateRequest calls DELETE /api/date-requests/{id}', async () => {
    mockedClient.delete.mockResolvedValueOnce({});

    await cancelDateRequest('456');

    expect(mockedClient.delete).toHaveBeenCalledWith('/api/date-requests/456');
  });

  it('getMyGroups calls GET /api/matching/my-groups', async () => {
    const mockGroups = [{ id: 'g1', activity: 'bowling', status: 'upcoming' }];
    mockedClient.get.mockResolvedValueOnce({ data: mockGroups });

    const result = await getMyGroups();

    expect(mockedClient.get).toHaveBeenCalledWith('/api/matching/my-groups');
    expect(result).toEqual(mockGroups);
  });

  it('getMyMatches calls GET /api/matches', async () => {
    const mockMatches = [{ id: 'm1', partner: { first_name: 'Alice' } }];
    mockedClient.get.mockResolvedValueOnce({ data: mockMatches });

    const result = await getMyMatches();

    expect(mockedClient.get).toHaveBeenCalledWith('/api/matches');
    expect(result).toEqual(mockMatches);
  });
});
