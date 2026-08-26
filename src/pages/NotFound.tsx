import { Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';

// 정의되지 않은 경로로 진입했을 때(오타 링크, 잘못된 딥링크 등) 흰 화면 대신 표시.
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold>
      <EmptyState
        title="페이지를 찾을 수 없어요"
        description="주소를 다시 확인해 주세요"
        action={
          <Button variant="weak" onClick={() => navigate('/')}>
            홈으로
          </Button>
        }
        testId="not-found"
      />
    </ScreenScaffold>
  );
}
