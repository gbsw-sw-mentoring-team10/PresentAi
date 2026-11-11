import SubmissionNotice from '../features/feedback/SubmissionNotice.jsx'
import FeedbackFormGuide from '../features/feedback/FeedbackFormGuide.jsx'
import AudioUpload from '../features/feedback/AudioUpload.jsx'
import ScriptInput from '../features/feedback/ScriptInput.jsx'
import MaterialUpload from '../features/feedback/MaterialUpload.jsx'
import PresentationFields from '../features/feedback/PresentationFields.jsx'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import FeedbackSteps from '../features/feedback/FeedbackSteps.jsx'
import SampleFileWarning from '../features/feedback/SampleFileWarning.jsx'
import { isExampleForm } from '../features/feedback/exampleForm.js'

import useFeedbackForm from '../features/feedback/useFeedbackForm.js'

export default function FeedbackPage({ mode, form, setForm, navigate, start }) {
  const speech = mode === 'speech'
  const {
    errors,
    scriptMode,
    changeScriptMode,
    readingScript,
    scriptFile,
    purposeRef,
    updateField,
    setFieldError,
    readScript,
    handleSubmit,
    fillExample,
    sampleWarning,
    closeSampleWarning,
    continueWithoutSample,
    reselectFile,
  } = useFeedbackForm({ mode, form, setForm, start })
  const example = isExampleForm(form, mode)

  return (
    <div className="workspace-page section-wrap">
      <button className="back-link" onClick={() => navigate('/')}>
        <Icon name="back" size={16} />
        홈으로
      </button>
      <FeedbackSteps />
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            {speech ? 'PRACTICE. REFLECT. REPEAT.' : 'A STRONGER STORY STARTS HERE.'}
          </span>
          <h1>{speech ? '말에 자신감을 더해 보세요.' : '어떤 발표를 준비하고 있나요?'}</h1>
          <p>
            {speech
              ? '대본과 리허설 음성을 준비하고, 전달 방식을 돌아보세요.'
              : '발표의 목적을 알려 주시면, 자료를 바라보는 기준이 생겨요.'}
          </p>
        </div>
        <button className="text-button example-fill" onClick={fillExample}>
          <Icon name="sparkle" size={16} />
          예시 자료로 채우기
        </button>
      </div>
      <div className="form-layout">
        <form onSubmit={handleSubmit} noValidate>
          <PresentationFields
            form={form}
            purposeError={errors.purpose}
            onChange={updateField}
            purposeRef={purposeRef}
          />
          {!speech && (
            <MaterialUpload
              file={form.file}
              error={errors.file}
              onFile={(file) => updateField('file', file)}
              onError={(message) => setFieldError('file', message)}
            />
          )}
          <ScriptInput
            stepNumber={speech ? '02' : '03'}
            scriptMode={scriptMode}
            onModeChange={changeScriptMode}
            script={form.script}
            onScriptChange={(script) => updateField('script', script)}
            scriptFile={scriptFile}
            onScriptFileChange={readScript}
            error={errors.script}
            onError={(message) => setFieldError('script', message)}
          />
          <AudioUpload
            stepNumber={speech ? '03' : '04'}
            file={form.audio}
            error={errors.audio}
            onFile={(file) => updateField('audio', file)}
            onError={(message) => setFieldError('audio', message)}
          />
          <SubmissionNotice speech={speech} isExample={example} />
          <div className="form-actions">
            <button type="button" className="text-button" onClick={() => navigate('/')}>
              취소
            </button>
            <Button variant="yellow" type="submit" icon="sparkle" disabled={readingScript}>
              {speech ? '피드백 미리보기' : example ? '예시 분석 시작' : '분석 시작'}
            </Button>
          </div>
        </form>
        <FeedbackFormGuide speech={speech} onFillExample={fillExample} />
      </div>
      {sampleWarning && (
        <SampleFileWarning
          speech={speech}
          file={speech ? form.audio : form.file}
          onReselect={reselectFile}
          onContinue={continueWithoutSample}
          onClose={closeSampleWarning}
        />
      )}
    </div>
  )
}
