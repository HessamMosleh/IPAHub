import { ApiProperty } from '@nestjs/swagger';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { MemberDocumentKind } from '../member-document.schema';

export class MemberDocumentResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ enum: MemberDocumentKind })
  kind: MemberDocumentKind;

  @ApiProperty({ type: MediaFileDto })
  file: MediaFileDto;

  @ApiProperty()
  createdAt: Date;
}
