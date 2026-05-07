<script setup lang="ts">
definePageMeta({ name: 'top' });

const appConfig = useAppConfig();
const { $appRuntime } = useNuxtApp();

const t = (ja: string, en: string) => $appRuntime.t(ja, en);
const serviceName = computed(() => ($appRuntime.lang.value === 'ja' ? appConfig.service.nameJa : appConfig.service.name));
const infoPageUrl = computed(() => (
  $appRuntime.lang.value === 'ja'
    ? 'https://lab.ndl.go.jp/service/tsugidigi/'
    : 'https://lab.ndl.go.jp/service/tsugidigi/tsugidigi_en/'
));
const ocrDatasetUrl = computed(() => (
  $appRuntime.lang.value === 'ja'
    ? 'https://lab.ndl.go.jp/data_set/ocr/r3_text/'
    : 'https://lab.ndl.go.jp/data_set/ocr_en/r3_text/'
));
</script>

<template>
  <main class="page-shell top-page">
    <div class="page-title-row">
      <div>
        <h1>{{ serviceName }}</h1>
      </div>
    </div>

    <section class="top-actions">
      <NuxtLink class="top-action top-action-primary" to="/fulltext">
        {{ t('全文から検索する', 'Keyword search') }}
      </NuxtLink>
      <NuxtLink class="top-action top-action-danger" to="/illust">
        {{ t('画像から検索する', 'Illustration search') }}
      </NuxtLink>
    </section>

    <section class="panel top-info">
      <p>
        {{
          t(
            '「次世代デジタルライブラリー」は、国立国会図書館次世代システム開発研究室での研究を元に開発した実験的な検索サービスです。',
            '"Next Digital Library" is an experimental digital library system based on several research results of the R&D Office at the NDL.',
          )
        }}
      </p>
      <p>
        {{
          t(
            '国立国会図書館デジタルコレクションで公開されている資料の中から、送信制限の無い資料を中心に約35万点の検索が可能です。',
            'You can search about 350,000 materials (as of November 2022) in public domain available in the National Diet Library Digital Collections.',
          )
        }}
      </p>
      <p>{{ t('以下の機能をそなえています。', 'It offers following functionalities:') }}</p>
      <ul class="feature-list">
        <li>
          {{
            t(
              '「全文から検索する」では、OCRにより生成された全文テキストから資料を検索できます。ヒットした箇所はスニペット形式で表示されるほか、資料画像の上に一致語がピンで表示されます。現在の対象資料は次のとおりです。',
              'Keyword Search allows you to search full texts OCR-generated from books.',
            )
          }}
          <ul>
            <li>
              {{
                t(
                  '令和3年度デジタル資料のOCRテキスト化事業のテキストデータを使った約28万点の書籍資料',
                  'About 280,000 book materials using text data from the "OCR Text Conversion Project of Digitized Materials in FY2021"',
                )
              }}
              <a :href="ocrDatasetUrl">({{ ocrDatasetUrl }})</a>
            </li>
            <li>
              {{
                t(
                  '令和4年度古典籍OCRテキスト化実験のテキストデータを使った約6万点の古典籍資料',
                  'Approximately 60,000 classical materials using text data from the "OCR Text Conversion Experiment of Classical Materials in FY2022"',
                )
              }}
              <a href="https://lab.ndl.go.jp/data_set/r4ocr/r4_koten/">(https://lab.ndl.go.jp/data_set/r4ocr/r4_koten/)</a>
            </li>
          </ul>
        </li>
        <li>
          {{
            t(
              '「画像から検索する」では、資料の中から自動的に切り出された約860万点の画像を検索できます。気になる画像を選ぶことで、似た画像を含む資料を探せます。',
              'Illustration Search allows you to explore 8.6 million illustrations automatically extracted from digitized materials. By selecting an illustration, you can identify books which contain similar illustrations.',
            )
          }}
        </li>
        <li>
          {{
            t(
              '切り出された画像には、機械学習により自動的にタグが付与され、タグを使った絞り込み検索が可能です。',
              'Semantic tags are automatically added to the extracted illustrations by machine learning, which allows you to refine your search using tags.',
            )
          }}
        </li>
        <li>
          {{
            t(
              '資料のビューアでは、見開き表示のほか、自動的にどの位置で切り出したページかを表示することが可能です。',
              'With our IIIF-powered book viewer, you can read materials as captured (two facing pages per image) or as page-by-page style by automatic splitting.',
            )
          }}
        </li>
        <li>
          {{
            t(
              'スキャン時のノイズ等を取り除くような画像補正（白色化）を行いダウンロードすることができます。処理に約15秒（1画像当たり）を要します。なお、主に文字の可読性向上を狙った処理のため、写真や図表などの補正はうまくいかないことがあります。',
              'You can whiten digitized materials which are discolored due to aging and download them. The process takes approximately 15 seconds per image. As this functionality is aimed at improving the readability of texts, it sometimes does not work well for pictures, graphics, etc.',
            )
          }}
        </li>
      </ul>
      <p>
        {{
          t(
            '二次利用に当たっては、サービス説明ページ',
            'For secondary use of this data, please refer to "Terms of Use" in the information page',
          )
        }}
        <a :href="infoPageUrl">({{ infoPageUrl }})</a>
        {{ t('の「ご利用に当たって」をご確認ください。', '.') }}
      </p>
      <p>
        {{
          t(
            '最新のFirefox又はChromeでの利用を想定しています。',
            'Latest Firefox and Chrome browsers are supported.',
          )
        }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.top-page {
  display: grid;
  gap: 1.5rem;
}

.top-actions {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.top-action {
  align-items: center;
  border-radius: 6px;
  color: #fff;
  display: inline-flex;
  font-size: 1.35rem;
  font-weight: 700;
  justify-content: center;
  min-height: 4.5rem;
  padding: 1rem 1.25rem;
  text-decoration: none;
}

.top-action-primary {
  background: #1673d1;
}

.top-action-danger {
  background: #d9534f;
}

.top-info {
  color: #23374d;
  display: grid;
  gap: 1rem;
  line-height: 1.8;
}

.top-info p,
.top-info ul {
  margin: 0;
}

.feature-list {
  display: grid;
  gap: 0.9rem;
  padding-left: 1.35rem;
}

.feature-list ul {
  display: grid;
  gap: 0.5rem;
  padding-left: 1.2rem;
}

.top-info a {
  color: #005eb8;
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .top-actions {
    grid-template-columns: 1fr;
  }
}
</style>
