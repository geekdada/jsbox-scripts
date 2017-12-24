'use strict';

const API_PREFIX = 'https://hacker-news.firebaseio.com/v0';

const settings = {
  pageSize: 10,
  currentPage: 1,
};
const constant = {
  API_TOP_STORY_LIST: `${API_PREFIX}/topstories.json`,
  API_ITEM: id => `${API_PREFIX}/item/${id}.json`,
  KEY_TOP_STORY_ID_LIST: 'KEY_TOP_STORY_ID_LIST',
  KEY_ITEM: id => `KEY_ITEM_${id}`,
};
const template = [
  {
    type: 'label',
    props: {
      id: 'score',
      font: $font('bold', 16),
      textColor: $color('#95a5a6'),
      align: $align.center
    },
    layout(make, view) {
      make.top.inset(10);
      make.left.inset(10);
      make.width.equalTo(28);
    },
  },
  {
    type: 'label',
    props: {
      id: 'title',
      font: $font(16),
      lines: 2,
    },
    layout(make) {
      const scoreView = $('score');
      make.top.inset(10);
      make.left.equalTo(scoreView.right).offset(8)
      make.right.inset(10);
    },
  }, {
    type: 'label',
    props: {
      id: 'by',
      font: $font(14),
      textColor: $color('#95a5a6'),
    },
    layout(make) {
      const nextView = $('time');
      make.height.equalTo(17);
      make.bottom.equalTo(0).offset(-44);
      make.left.inset(10);
      make.right.inset(10);
    },
  }, {
    type: 'label',
    props: {
      id: 'time',
      font: $font(14),
      textColor: $color('#95a5a6'),
    },
    layout(make) {
      make.height.equalTo(17);
      make.bottom.equalTo(0).offset(-27);
      make.left.inset(10);
      make.right.inset(10);
    },
  }, {
    type: 'label',
    props: {
      id: 'source',
      font: $font(14),
      textColor: $color('#95a5a6'),
    },
    layout(make, view) {
      make.height.equalTo(17);
      make.bottom.equalTo(0).offset(-10);
      make.left.inset(10);
      make.right.inset(10);
    },
  },
];

function requestItem(id) {
  return new Promise((resolve, reject) => {
    $http.get({
      url: constant.API_ITEM(id),
      handler(resp) {
        if (resp.error) {
          reject(resp.error);
        } else {
          resolve(resp.data);
        }
      },
    });
  });
}

function requestTopStoryList(page = 1) {
  function getIdList() {
    if (page === 1) {
      return new Promise((resolve, reject) => {
        $http.get({
          url: constant.API_TOP_STORY_LIST,
          handler(resp) {
            if (resp.error) {
              reject(resp.error);
            } else {
              resolve(resp.data);
            }
          }
        })
      }).then(topStoryIdList => {
        return new Promise(resolve => {
          $cache.setAsync({
            key: constant.KEY_TOP_STORY_ID_LIST,
            value: topStoryIdList,
            handler() {
              resolve(topStoryIdList);
            }
          })
        });
      });
    }
    return new Promise(resolve => {
      $cache.getAsync({
        key: constant.KEY_TOP_STORY_ID_LIST,
        handler(object) {
          resolve(object);
        }
      });
    });
  }

  return getIdList()
    .then(topStoryIdList => {
      const { pageSize } = settings;
      const idRange = topStoryIdList.splice((page - 1) * pageSize, page * pageSize);
      return Promise.all(idRange.map(id => requestItem(id)));
    });
}

function makeListView(type) {
  return {
    type: 'list',
    props: {
      id: `${type}-list-view`,
      hidden: false,
      bgcolor: $color('#F9F9F9'),
      rowHeight: 120,
      template: template,
    },
    data: [],
    layout: $layout.fill,
    actions: [
      {
        title: "Comments",
        handler(sender, indexPath) {
          
        }
      },
    ],
    events: {
      didSelect(sender, indexPath, data) {
        $safari.open({
          url: `https://vue-hn.now.sh/item/${data.story.id}`,
          entersReader: false,
        });
      },
      pulled: async function(sender) {
        $device.taptic(1);
        settings.currentPage = 1;

        // 加载数据
        const storyList = await requestTopStoryList(settings.currentPage);
        $(`${type}-list-view`).data = storyList.map(makeStoryItemViewData);
        $(`${type}-list-view`).endRefreshing();
      },
      didReachBottom: async function(sender) {
        // 加载数据
        $ui.loading(true);
        const storyList = await requestTopStoryList(settings.currentPage);

        settings.currentPage++;
        const newList = storyList.map(makeStoryItemViewData);
        $(`${type}-list-view`).data = $(`${type}-list-view`).data.concat(newList);
        $(`${type}-list-view`).endFetchingMore();
        $ui.loading(false);
      }
    },
  };
}

function makeStoryItemViewData(story) {
  return {
    story,
    id: story.id,
    title: {
      text: story.title,
    },
    by: {
      text: `by: ${story.by}`,
    },
    score: {
      text: story.score.toString(),
    },
    time: {
      text: `time: ${(new Date(story.time * 1000)).toLocaleString()}`,
    },
    source: {
      text: `source: ${getDomain(story.url)}`
    },
  };
}

async function renderMainView() {
  const perWidth = $device.info.screen.width / 1;

  $ui.render({
    props: {
      title: 'Hacker News',
    },
    views: [
      {
        type: 'view',
        props: {
          id: 'menu',
          bgcolor: $color('#FFFFFF'),
        },
        layout: function(make) {
          make.height.equalTo(50);
          make.left.right.inset(0);
          make.bottom.inset(34);
        },
        views: [
          {
            type: 'button',
            props: {
              bgcolor: $color('clear'),
            },
            layout: function(make, view) {
              make.width.equalTo(perWidth);
              make.left.top.bottom.inset(0);
            },
            views: [
              {
                type: 'image',
                props: {
                  id: 'recent_button',
                  icon: $icon('067', $color('clear'), $size(72, 72)),
                  bgcolor: $color('clear'),
                  tintColor: $color('darkGray'),
                },
                layout: function(make, view) {
                  make.centerX.equalTo(view.super);
                  make.width.height.equalTo(25);
                  make.top.inset(7);
                },
              },
              {
                type: 'label',
                props: {
                  id: 'recent_label',
                  text: 'Recent',
                  font: $font(12),
                  textColor: $color('darkGray'),
                },
                layout: function(make, view) {
                  var preView = view.prev;
                  make.centerX.equalTo(preView);
                  make.top.equalTo(preView.bottom).offset(1);
                },
              },
            ],
            events: {
              tapped() {
                activeMenu('recent-list-view');
              },
            },
          },
          {
            type: 'canvas',
            layout: function(make) {
              make.height.equalTo(1);
              make.left.top.right.inset(0);
            },
            events: {
              draw: function(view, ctx) {
                var width = view.frame.width;
                ctx.strokeColor = $rgb(211, 211, 211);
                ctx.setLineWidth(1);
                ctx.moveToPoint(0, 0);
                ctx.addLineToPoint(width, 0);
                ctx.strokePath();
              },
            },
          },
        ],
      },
      {
        type: 'view',
        props: {
          id: 'content',
        },
        layout(make) {
          const preView = $('menu');
          make.bottom.equalTo(preView.top);
          make.left.top.right.inset(0);
        },
        views: [
          makeListView('recent'),
        ],
      },
    ],
  });
}

async function requestInitialData() {
  // 加载数据
  $ui.loading(true);
  const topStoryList = await requestTopStoryList(settings.currentPage);
  $ui.loading(false);

  settings.currentPage++;
  $('recent-list-view').data = topStoryList.map(makeStoryItemViewData);
}

function activeMenu(dstViewId) {
  var viewId = $('content').views.filter(view => {
    return view.hidden == false;
  })[0].id;
  if (dstViewId == viewId) {
    $ui.animate({
      duration: 0.3,
      animation() {
        $(dstViewId).contentOffset = $point(0, 0);
      },
    });
  } else {
    $(viewId + '_button').tintColor = $color('lightGray');
    $(dstViewId + '_button').tintColor = $color('darkGray');
    $(viewId).hidden = true;
    $(dstViewId).hidden = false;
  }
}

function main() {
  renderMainView();
  requestInitialData();
}

// main
main();

// Utils
function getCache(key) {
  return new Promise(resolve => {
    $cache.getAsync({
      key,
      handler(object) {
        resolve(object);
      }
    });
  });
}

function getDomain(url = '') {
  const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im)
  return match && match[1] || '';
}