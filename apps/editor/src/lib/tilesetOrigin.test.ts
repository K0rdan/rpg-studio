import { ObjectId } from 'mongodb';
import { resolveTilesetOrigin } from './tilesetOrigin';

describe('resolveTilesetOrigin', () => {
  it('identifies a configured tileset as registry-owned', () => {
    expect(resolveTilesetOrigin('ts1')).toBe('registry');
  });

  it('identifies a MongoDB tileset id as project-owned', () => {
    expect(resolveTilesetOrigin(new ObjectId().toHexString())).toBe('project');
  });
});
