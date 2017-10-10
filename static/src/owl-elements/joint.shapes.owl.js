'use strict';
joint.shapes.owl = {};
joint.shapes.owl.Class = joint.shapes.basic.Rect.extend({
    defaults: joint.util.deepSupplement({
        type: 'owl.Class',
    }, joint.shapes.basic.Rect.prototype.defaults),
});

joint.shapes.owl.ClassView = joint.dia.ElementView.extend({
    template: [
        '<div class="owl-class resizable label-container">',
        '<label class="label-content"></label>',
        '</div>',
    ].join(''),

    initialize: function () {
        joint.dia.ElementView.prototype.initialize.apply(this, arguments);
        this.$bbox = $(_.template(this.template)());
        this.$label = this.$bbox.find('label');
        this.model.on('change', this.updateBox, this);
        this.model.on('remove', this.removeBox, this);
        this.updateBox();
    },

    updateText: function (text) {
        this.$label.html(text.replace(/\n/g, '<br/>'));
        this.model.resize(this.$label.width() + 8, this.$label.height() + 8);
    },

    render: function () {
        joint.dia.ElementView.prototype.render.apply(this, arguments);
        this.paper.$el.prepend(this.$bbox);
        return this;
    },

    updateBox: function () {
        let $bbox = this.model.getBBox();
        this.$bbox.css({
            width: $bbox.width,
            height: $bbox.height,
            left: $bbox.x,
            top: $bbox.y,
            transform: [
                'rotate(' + (this.model.get('angle') || 0) + 'deg)',
                'translate(var(--translate-x, 0), var(--translate-y, 0))',
            ].join(' '),
        });
    },

    removeBox: function () {
        this.$bbox.remove();
    },
});

joint.shapes.owl.Property = joint.dia.Link.extend({
    arrowheadMarkup: [
        '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
        '<circle class="marker-arrowhead" end="<%= end %>" r="8"/>',
        '</g>'
    ].join(''),
    defaults: joint.util.deepSupplement({
        type: 'owl.Property',
        // router: {
        //     // name: 'manhattan',
        //     name: 'orthogonal',
        // },
        // connector: {
        //     // name: 'smooth',
        //     name: 'rounded',
        // },
        attrs: {
            '.marker-target': {
                d: 'M 10 0 L 0 5 L 10 10 z',
            },
        },
        z: -1,
    }, joint.dia.Link.prototype.defaults),
});

joint.shapes.owl.Transition = joint.dia.Link.extend({
    arrowheadMarkup: [
        '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
        '<circle class="marker-arrowhead" end="<%= end %>" r="8"/>',
        '</g>'
    ].join(''),
    defaults: joint.util.deepSupplement({
        type: 'owl.Transition',
        // router: {
        //     // name: 'manhattan',
        //     name: 'orthogonal',
        // },
        // connector: {
        //     // name: 'smooth',
        //     name: 'rounded',
        // },
        attrs: {
            '.marker-target': {
                d: 'M 10 0 L 0 5 L 10 10 z',
            },
        },
        z: -1,
    }, joint.dia.Link.prototype.defaults),
});