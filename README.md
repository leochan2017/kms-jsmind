# kmsjsmap

> KMS用知识地图 思维导图 JS库


# 1.引入样式
```
<link rel="stylesheet" type="text/css" href="./dist/kmsjsmap.min.css">
```

# 2.引入JS库
```
<script type="text/javascript" src="./dist/kmsjsmap.min.js"></script>
```


# 调用示例
```
kmsjsmap.init({
    container: 'jsmind_container',
    data: [
      { "id": "root", "isroot": true, "topic": "蓝凌软件", "badge": 10 },

      { "id": "sub1", "parentid": "root", "topic": "总裁办公室", "badge": 20 },
      { "id": "sub12", "parentid": "sub1", "topic": "杨建伟", "badge": 30 },
      { "id": "sub121", "parentid": "sub1", "topic": "徐霞", "badge": 44 },

      { "id": "sub3", "parentid": "root", "topic": "产品研发中心", "badge": 66 },

      { "id": "sub31", "parentid": "sub3", "topic": "前端", "badge": 233 },
      { "id": "sub311", "parentid": "sub31", "topic": "Leo", "badge": 53 },
      { "id": "sub312", "parentid": "sub31", "topic": "李冰", "badge": 75 },
      { "id": "sub313", "parentid": "sub31", "topic": "曹叶", "badge": 5 },
      { "id": "sub314", "parentid": "sub31", "topic": "陈荆晓", "badge": 2 },

      { "id": "sub32", "parentid": "sub3", "topic": "后端", "badge": 9 },
      { "id": "sub321", "parentid": "sub32", "topic": "陈志勇", "badge": 89 },
      { "id": "sub322", "parentid": "sub32", "topic": "唐刚", "badge": 24 },
      { "id": "sub323", "parentid": "sub32", "topic": "曾攀", "badge": 65 },
      { "id": "sub324", "parentid": "sub32", "topic": "叶杰林", "badge": 89 },

      { "id": "sub33", "parentid": "sub3", "topic": "其它", "badge": 7 },
      { "id": "sub331", "parentid": "sub33", "topic": "王品", "badge": 23 },
      { "id": "sub332", "parentid": "sub33", "topic": "余小冬", "badge": 54 }
    ],
    onSave: function(res) {
      console.log(res)
    }
```

# API 说明

参数 | 类型 | 是否必填 | 说明
-----  | ---- | -------- | -----
container | String | 是  | 容器元素ID
data | Array(Object) | 否  | 初始数据
onSave | Function | 否 | 用户点击"保存思维导图"按钮的回调函数，返回当前的数据结构
editable | Boolean | 否 | 是否允许编辑

# API - data 说明
参数 | 类型 | 是否必填 | 说明
-----  | ---- | -------- | -----
id | String | 是  | 当前节点的ID
parentid | String | 是 | 父节点的ID
topic | String | 是 | 当前节点的内容文字
direction | Boolean | 否 | 当前节点的方向，此数据仅在第一层节点上有效，目前仅支持 left 和 right[默认] 两种
badge | Number | 否 | 当前节点的右上角小图标，如不传或传入0则不显示