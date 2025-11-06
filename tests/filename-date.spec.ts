import { detectFilenameDate } from '../src/features/metadata/filename-date';

describe('detectFilenameDate', () => {
  it('should return undefined for non-date filenames', () => {
    expect(detectFilenameDate('GOPR1234.MP4')).toBeUndefined();
  });

  it('should detect date from 20140117_205643000_iOS.jpg', () => {
    const detected = detectFilenameDate('20140117_205643000_iOS.jpg');
    expect(detected?.date).toBe('2014-01-17T20:56:43');
    expect(detected?.source).toBe('filename');
  });

  it('should detect date from IMG_20140117_205643.jpg', () => {
    const detected = detectFilenameDate('IMG_20140117_205643.jpg');
    expect(detected?.date).toBe('2014-01-17T20:56:43');
  });

  it('should detect date from VID_20180314_143210.mp4', () => {
    const detected = detectFilenameDate('VID_20180314_143210.mp4');
    expect(detected?.date).toBe('2018-03-14T14:32:10');
  });

  it('should detect date from 2014-01-17 20.56.43.jpg', () => {
    const detected = detectFilenameDate('2014-01-17 20.56.43.jpg');
    expect(detected?.date).toBe('2014-01-17T20:56:43');
  });

  it('should detect date from WhatsApp Image 2019-05-03 at 14.22.10.jpeg', () => {
    const detected = detectFilenameDate('WhatsApp Image 2019-05-03 at 14.22.10.jpeg');
    expect(detected?.date).toBe('2019-05-03T14:22:10');
  });

  it('should detect date from PXL_20211225_123456789.jpg', () => {
    const detected = detectFilenameDate('PXL_20211225_123456789.jpg');
    expect(detected?.date).toBe('2021-12-25T12:34:56');
  });

  it('should handle ambiguous date 070320080823.mp4 as DDMMYYYY', () => {
    const detected = detectFilenameDate('070320080823.mp4');
    expect(detected?.date).toBe('2008-03-07T08:23:00');
  });
});
