import React from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {compose, gql} from 'react-apollo';
import {getDisplayName} from 'coral-framework/helpers/hoc';
import {capitalize} from 'coral-framework/helpers/strings';
import {withAddTag, withRemoveTag} from 'coral-framework/graphql/mutations';
import withFragments from 'coral-framework/hocs/withFragments';
import {addNotification} from 'coral-framework/actions/notification';
import {forEachError, isTagged} from 'coral-framework/utils';
import hoistStatics from 'recompose/hoistStatics';
import {getDefinitionName} from '../utils';

export default (tag, options = {}) => hoistStatics((WrappedComponent) => {
  if (typeof tag !== 'string') {
    console.error('Tag must be a valid string');
    return null;
  }

  // fragments allow the extension of the fragments defined in this HOC.
  const {fragments = {}} = options;

  const Tag = capitalize(tag);
  const TAG = tag.toUpperCase();

  class WithTags extends React.Component {
    loading = false;

    postTag = () => {
      const {comment, asset, addNotification} = this.props;

      if (this.loading) {
        return;
      }

      this.loading = true;

      this.props.addTag({
        id: comment.id,
        name: TAG,
        assetId: asset.id,
        itemType: 'COMMENTS',
      })
      .then(() => {
        this.loading = false;
      })
      .catch((err) => {
        this.loading = false;
        forEachError(err, ({msg}) => addNotification('error', msg));
      });
    }

    deleteTag = () => {
      const {comment, asset, addNotification} = this.props;

      if (this.loading) {
        return;
      }

      this.props.removeTag({
        id: comment.id,
        name: TAG,
        assetId: asset.id,
        itemType: 'COMMENTS',
      })
      .then(() => {
        this.loading = false;
      })
      .catch((err) => {
        this.loading = false;
        forEachError(err, ({msg}) => addNotification('error', msg));
      });
    }

    render() {
      const {root, asset, comment, user, config} = this.props;

      const alreadyTagged = isTagged(comment.tags, TAG);

      return <WrappedComponent
        root={root}
        asset={asset}
        comment={comment}
        user={user}
        alreadyTagged={alreadyTagged}
        postTag={this.postTag}
        deleteTag={this.deleteTag}
        config={config}
      />;
    }
  }

  const mapStateToProps = (state) => ({
    user: state.auth.user,
  });

  const mapDispatchToProps = (dispatch) =>
    bindActionCreators({addNotification}, dispatch);

  const enhance = compose(
    withFragments({
      ...fragments,
      asset: gql`
        fragment ${Tag}Button_asset on Asset {
          id
          ${fragments.asset ? `...${getDefinitionName(fragments.asset)}` : ''}
        }
        ${fragments.asset ? fragments.asset : ''}
      `,
      comment: gql`
        fragment ${Tag}Button_comment on Comment {
          id
          tags {
            tag {
              name
            }
          }
          ${fragments.comment ? `...${getDefinitionName(fragments.comment)}` : ''}
        }
        ${fragments.comment ? fragments.comment : ''}
      `
    }),
    connect(mapStateToProps, mapDispatchToProps),
    withAddTag,
    withRemoveTag
  );

  WithTags.displayName = `WithTags(${getDisplayName(WrappedComponent)})`;

  return enhance(WithTags);
});
