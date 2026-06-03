import { siteConfig } from '../config/site';
import { SectionHeading } from '../components/ui/SectionHeading';

export function AboutPage() {
  return (
    <div className="page page-about">
      <section className="page-section about-page-hero narrow-section">
        <SectionHeading
          eyebrow="About"
          title="关于 Tengda Wang"
          description="我喜欢那些兼具判断力和完成度的东西，也愿意把它们写下来，慢慢形成自己的表达和工作方式。"
        />
      </section>

      <section className="page-section about-page-grid">
        <div>
          <h3>我在关注什么</h3>
          <p>
            技术系统如何更克制、更清楚、更适合人长期使用；产品如何在不确定里长出结构；AI 如何成为工作材料，而不仅是功能堆叠。
          </p>
        </div>
        <div>
          <h3>我怎么写</h3>
          <p>
            我会写项目过程、系统判断、工具体验，也会写一些介于工作与生活之间的观察。写作对我来说，不只是输出，也是整理自己。
          </p>
        </div>
        <div>
          <h3>联系方式</h3>
          <p>{siteConfig.profile.email}</p>
          <p>微信：{siteConfig.profile.wechat}</p>
          <p>{siteConfig.profile.location}</p>
        </div>
      </section>
    </div>
  );
}
