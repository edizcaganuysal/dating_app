import apiClient from '../../src/api/client';
import { createProfile, getMyProfile, updateProfile, selfieVerify } from '../../src/api/profiles';

jest.mock('../../src/api/client');

const mockedClient = apiClient as jest.Mocked<typeof apiClient>;

describe('profiles API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('createProfile calls POST /api/profiles with correct data', async () => {
    const profileData = {
      bio: 'Hello world',
      program: 'Computer Science',
      year_of_study: 2,
      photo_urls: ['url1', 'url2', 'url3'],
      interests: ['hiking', 'cooking'],
      vibe_answers: [
        { question: 'Friday night: house party or cozy bar?', answer: 'Cozy bar' },
        { question: 'Pineapple on pizza: yes or no?', answer: 'Yes' },
        { question: 'Road trip or beach vacation?', answer: 'Road trip' },
        { question: 'Early bird or night owl?', answer: 'Night owl' },
        { question: 'Cook at home or eat out?', answer: 'Cook at home' },
      ],
      age_range_min: 18,
      age_range_max: 25,
    };

    const mockResponse = { data: { id: '123', ...profileData } };
    mockedClient.post.mockResolvedValueOnce(mockResponse);

    const result = await createProfile(profileData);

    expect(mockedClient.post).toHaveBeenCalledWith('/api/profiles', profileData);
    expect(result).toEqual(mockResponse.data);
  });

  it('getMyProfile calls GET /api/profiles/me', async () => {
    const mockProfile = { id: '123', bio: 'Hello', first_name: 'Alice' };
    mockedClient.get.mockResolvedValueOnce({ data: mockProfile });

    const result = await getMyProfile();

    expect(mockedClient.get).toHaveBeenCalledWith('/api/profiles/me');
    expect(result).toEqual(mockProfile);
  });

  it('updateProfile calls PATCH /api/profiles/me', async () => {
    const updateData = { bio: 'Updated bio' };
    mockedClient.patch.mockResolvedValueOnce({ data: { id: '123', bio: 'Updated bio' } });

    const result = await updateProfile(updateData);

    expect(mockedClient.patch).toHaveBeenCalledWith('/api/profiles/me', updateData);
    expect(result.bio).toBe('Updated bio');
  });

  it('selfieVerify calls POST /api/profiles/selfie-verify', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { message: 'Verified' } });

    const result = await selfieVerify();

    expect(mockedClient.post).toHaveBeenCalledWith('/api/profiles/selfie-verify');
    expect(result.message).toBe('Verified');
  });
});
